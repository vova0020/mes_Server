import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { OrderDetailsResponseDto } from '../dto/machineNoSmen.dto';
import { EventsGateway } from 'src/modules/websocket/events.gateway';

@Injectable()
export class DetailsMachinNoSmenService {
  constructor(
    private prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Получить все детали для конкретного заказа и участка
   * Адаптировано под новую схему БД
   */
  async getOrderDetails(
    orderId: number,
    segmentId: number,
  ): Promise<OrderDetailsResponseDto> {
    // Проверяем, существует ли заказ (теперь Order)
    const order = await this.prisma.order.findUnique({
      where: { orderId },
    });

    if (!order) {
      throw new NotFoundException(`Заказ с ID ${orderId} не найден`);
    }

    // Проверяем, существует ли участок (теперь ProductionStageLevel1)
    const segment = await this.prisma.productionStageLevel1.findUnique({
      where: { stageId: segmentId },
      include: {
        productionStagesLevel2: true, // подэтапы
        routeStages: true, // этапы в маршрутах
        machinesStages: {
          include: {
            machine: true,
          },
        },
      },
    });

    if (!segment) {
      throw new NotFoundException(
        `Производственный участок с ID ${segmentId} не найден`,
      );
    }

    // Получаем все пакеты (бывшие УПАК-и), связанные с этим заказом
    const packages = await this.prisma.package.findMany({
      where: { orderId },
      include: {
        productionPackageParts: {
          include: {
            part: {
              include: {
                material: true,
                route: {
                  include: {
                    routeStages: {
                      include: {
                        stage: true,
                        substage: true,
                      },
                      orderBy: {
                        sequenceNumber: 'asc',
                      },
                    },
                  },
                },
                pallets: {
                  include: {
                    palletStageProgress: {
                      include: {
                        routeStage: {
                          include: {
                            stage: true,
                            substage: true,
                          },
                        },
                      },
                      orderBy: {
                        pspId: 'desc',
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    // Если пакетов нет, возвращаем пустой массив
    if (packages.length === 0) {
      return { details: [] };
    }

    // Формируем список деталей из всех пакетов
    const detailsMap = new Map();

    // Получаем этапы для данного участка
    const segmentStageIds = [segmentId]; // основной этап
    const segmentSubstageIds = segment.productionStagesLevel2.map(s => s.substageId);

    // Проходим по всем пакетам и деталям в них
    for (const packageItem of packages) {
      for (const packagePart of packageItem.productionPackageParts) {
        const part = packagePart.part;

        // Проверяем, относится ли деталь к нужному участку через маршрут
        const partRelatedToSegment = await this.isPartRelatedToSegment(
          part.partId,
          segmentId,
          segmentSubstageIds
        );

        if (!partRelatedToSegment) {
          continue; // Пропускаем детали, не относящиеся к этому участку
        }

        // Если детали еще нет в карте, добавляем её
        if (!detailsMap.has(part.partId)) {
          // Определяем, является ли текущий участок первым в маршруте
          const isFirstSegment = await this.isFirstSegmentForPart(
            part.partId,
            segmentId,
          );

          // Определяем предыдущий участок
          const previousSegment = await this.getPreviousSegmentForPart(
            part.partId,
            segmentId,
          );

          // Вычисляем статистику
          let readyForProcessing = 0;
          let completed = 0;

          // Получаем все поддоны для данной детали
          const pallets = part.pallets;

          if (isFirstSegment) {
            // Если это первый участок, все поддоны готовы к обработке
            readyForProcessing = pallets.length;

            // Вычитаем завершенные на этом участке
            for (const pallet of pallets) {
              const hasCompletedOnSegment = pallet.palletStageProgress.some(progress =>
                (segmentStageIds.includes(progress.routeStage.stageId) ||
                 (progress.routeStage.substageId && segmentSubstageIds.includes(progress.routeStage.substageId))) &&
                progress.status === 'COMPLETED'
              );

              if (hasCompletedOnSegment) {
                completed += 1;
                readyForProcessing -= 1;
              }
            }
          } else if (previousSegment) {
            // Если не первый участок, учитываем только поддоны с завершенным предыдущим этапом
            for (const pallet of pallets) {
              const hasCompletedPrevious = await this.hasCompletedPreviousStage(
                pallet.palletId,
                previousSegment.stageId
              );

              if (hasCompletedPrevious) {
                readyForProcessing += 1;

                // Проверяем завершенность на текущем участке
                const hasCompletedCurrent = pallet.palletStageProgress.some(progress =>
                  (segmentStageIds.includes(progress.routeStage.stageId) ||
                   (progress.routeStage.substageId && segmentSubstageIds.includes(progress.routeStage.substageId))) &&
                  progress.status === 'COMPLETED'
                );

                if (hasCompletedCurrent) {
                  completed += 1;
                  readyForProcessing -= 1;
                }
              }
            }
          }

          detailsMap.set(part.partId, {
            id: part.partId,
            article: part.partCode,
            name: part.partName,
            material: part.material.materialName,
            size: part.size,
            totalNumber: Number(packagePart.quantity),
            isCompletedForSegment: completed === pallets.length && pallets.length > 0,
            readyForProcessing,
            completed,
          });
        } else {
          // Увеличиваем общее количество для этой детали
          const currentDetail = detailsMap.get(part.partId);
          currentDetail.totalNumber += Number(packagePart.quantity);
          detailsMap.set(part.partId, currentDetail);
        }
      }
    }

    return {
      details: Array.from(detailsMap.values()),
    };
  }

  /**
   * Проверяет, относится ли деталь к данному участку
   */
  private async isPartRelatedToSegment(
    partId: number,
    segmentId: number,
    segmentSubstageIds: number[]
  ): Promise<boolean> {
    const part = await this.prisma.part.findUnique({
      where: { partId },
      include: {
        route: {
          include: {
            routeStages: {
              include: {
                stage: true,
                substage: true,
              },
            },
          },
        },
      },
    });

    if (!part?.route) {
      return false;
    }

    // Проверяем, есть ли в маршруте этапы, относящиеся к данному участку
    return part.route.routeStages.some(routeStage =>
      routeStage.stageId === segmentId ||
      (routeStage.substageId && segmentSubstageIds.includes(routeStage.substageId))
    );
  }

  /**
   * Определяет, является ли участок первым в маршруте для детали
   */
  private async isFirstSegmentForPart(
    partId: number,
    segmentId: number,
  ): Promise<boolean> {
    const part = await this.prisma.part.findUnique({
      where: { partId },
      include: {
        route: {
          include: {
            routeStages: {
              include: {
                stage: true,
              },
              orderBy: {
                sequenceNumber: 'asc',
              },
            },
          },
        },
      },
    });

    if (!part?.route?.routeStages?.length) {
      return true; // Если нет маршрута, считаем первым
    }

    const firstStage = part.route.routeStages[0];
    return firstStage.stageId === segmentId;
  }

  /**
   * Получает предыдущий участок в маршруте для детали
   */
  private async getPreviousSegmentForPart(
    partId: number,
    currentSegmentId: number,
  ): Promise<any> {
    const part = await this.prisma.part.findUnique({
      where: { partId },
      include: {
        route: {
          include: {
            routeStages: {
              include: {
                stage: true,
              },
              orderBy: {
                sequenceNumber: 'asc',
              },
            },
          },
        },
      },
    });

    if (!part?.route?.routeStages?.length) {
      return null;
    }

    const currentIndex = part.route.routeStages.findIndex(
      stage => stage.stageId === currentSegmentId
    );

    if (currentIndex <= 0) {
      return null; // Первый или не найден
    }

    return part.route.routeStages[currentIndex - 1].stage;
  }

  /**
   * Проверяет, завершен ли предыдущий этап для поддона
   */
  private async hasCompletedPreviousStage(
    palletId: number,
    previousStageId: number
  ): Promise<boolean> {
    const progress = await this.prisma.palletStageProgress.findFirst({
      where: {
        palletId,
        routeStage: {
          stageId: previousStageId,
        },
        status: 'COMPLETED',
      },
    });

    return !!progress;
  }
}