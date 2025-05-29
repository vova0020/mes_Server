import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class DetailsMasterService {
  constructor(private prisma: PrismaService) {}

  /**
   * Получение списка деталей для указанного заказа с учетом участка обработки
   * @param orderId - ID производственного заказа
   * @param segmentId - ID участка, к которому привязан мастер
   */
  async getDetailsByOrderId(orderId: number, segmentId: number) {
    // Проверяем существование заказа
    const orderExists = await this.prisma.productionOrder.findUnique({
      where: { id: orderId },
    });

    if (!orderExists) {
      throw new NotFoundException(
        `Производственный заказ с ID ${orderId} не найден`,
      );
    }

    // Проверяем существование участка
    const segmentExists = await this.prisma.productionSegment.findUnique({
      where: { id: segmentId },
      include: {
        processSteps: {
          include: {
            processStep: true,
          },
        },
      },
    });

    if (!segmentExists) {
      throw new NotFoundException(
        `Производственный участок с ID ${segmentId} не найден`,
      );
    }

    // Получаем информацию о станках, привязанных к этому участку
    const segmentMachines = await this.prisma.machine.findMany({
      where: { segmentId },
      select: { id: true },
    });
    const machineIds = segmentMachines.map((machine) => machine.id);

    // Получаем этапы обработки для данного участка
    const segmentProcessStepIds = segmentExists.processSteps.map(
      (sps) => sps.processStepId,
    );

    // Находим все УПАКи, связанные с заказом
    const ypaks = await this.prisma.productionYpak.findMany({
      where: { orderId },
      include: {
        details: {
          include: {
            detail: {
              include: {
                route: {
                  include: {
                    steps: {
                      include: {
                        processStep: true,
                      },
                      orderBy: {
                        sequence: 'asc',
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

    // Если УПАКов нет, возвращаем пустой массив
    if (ypaks.length === 0) {
      return [];
    }

    // Формируем список деталей из всех УПАКов с подсчетом количества
    const detailsMap = new Map();

    // Проходим по всем УПАКам и деталям в них
    for (const ypak of ypaks) {
      for (const ypakDetail of ypak.details) {
        const detail = ypakDetail.detail;

        // Если детали еще нет в нашей карте, добавляем её
        if (!detailsMap.has(detail.id)) {
          // Определяем технологический маршрут для детали
          const route = detail.route;
          const routeSteps = route
            ? route.steps.map((step) => ({
                processStepId: step.processStepId,
                sequence: step.sequence,
              }))
            : [];

          // Определяем, какие этапы относятся к текущему участку
          const currentSegmentStepIds = segmentProcessStepIds;

          // Определяем предыдущие этапы в маршруте до этапов текущего участка
          // Исправлено: явно указываем тип массива как number[]
          let previousStepIds: number[] = [];
          let isFirstSegment = false;

          if (routeSteps.length > 0) {
            // Находим минимальную последовательность для этапов текущего участка
            const currentSegmentStepsInRoute = routeSteps.filter((step) =>
              currentSegmentStepIds.includes(step.processStepId),
            );

            if (currentSegmentStepsInRoute.length > 0) {
              const minSequence = Math.min(
                ...currentSegmentStepsInRoute.map((step) => step.sequence),
              );

              // Если минимальная последовательность равна 1, это первый участок
              isFirstSegment = minSequence === 1;

              // Находим все предыдущие этапы в маршруте
              previousStepIds = routeSteps
                .filter((step) => step.sequence < minSequence)
                .map((step) => step.processStepId);
            }
          } else {
            // Если маршрут не определен, проверяем, есть ли этот этап на данном участке
            // Если это первый участок в производственной линии, то считаем его первым
            const segment = await this.prisma.productionSegment.findUnique({
              where: { id: segmentId },
              include: {
                line: {
                  include: {
                    segments: {
                      orderBy: {
                        id: 'asc',
                      },
                    },
                  },
                },
              },
            });

            // Исправлено: добавляем проверку на null для segment и segment.line
            isFirstSegment =
              segment !== null &&
              segment.line !== null &&
              segment.line.segments.length > 0 &&
              segment.line.segments[0].id === segmentId;
          }

          // Получаем информацию о поддонах для данной детали
          const pallets = await this.prisma.productionPallets.findMany({
            where: { detailId: detail.id },
            include: {
              detailOperations: {
                include: {
                  processStep: true,
                  machine: true,
                },
              },
            },
          });

          // Вычисляем распределение по статусам с учетом участка
          let readyForProcessing = 0;
          let distributed = 0;
          let completed = 0;

          for (const pallet of pallets) {
            const quantity = pallet.quantity;
            const operations = pallet.detailOperations;

            // Находим операции, относящиеся к этапам текущего участка
            const currentSegmentOperations = operations.filter((op) =>
              currentSegmentStepIds.includes(op.processStepId),
            );

            // Находим операции, относящиеся к предыдущим этапам
            const previousStepOperations = operations.filter((op) =>
              previousStepIds.includes(op.processStepId),
            );

            // Проверяем, завершены ли операции на предыдущих этапах
            const isPreviousStepsCompleted =
              previousStepOperations.length > 0 &&
              previousStepOperations.every((op) => op.status === 'COMPLETED');

            // Проверяем, есть ли операции на текущем участке
            if (currentSegmentOperations.length > 0) {
              // Берем последнюю операцию на текущем участке
              const latestOperation = currentSegmentOperations.sort(
                (a, b) =>
                  new Date(b.startedAt).getTime() -
                  new Date(a.startedAt).getTime(),
              )[0];

              // Определяем статус детали на текущем участке
              if (latestOperation.status === 'COMPLETED') {
                completed += quantity;
              } else if (
                ['IN_PROGRESS', 'ON_MACHINE'].includes(
                  latestOperation.status,
                ) &&
                latestOperation.machineId !== null && // Исправлено: проверяем на null
                machineIds.includes(latestOperation.machineId)
              ) {
                distributed += quantity;
              }
            } else if (isFirstSegment && operations.length === 0) {
              // Если это первый участок и нет операций вообще, деталь готова к обработке на первом участке
              readyForProcessing += quantity;
            } else if (!isFirstSegment && isPreviousStepsCompleted) {
              // Если не первый участок и предыдущие этапы завершены, деталь готова к обработке на текущем участке
              readyForProcessing += quantity;
            }
          }

          detailsMap.set(detail.id, {
            id: detail.id,
            articleNumber: detail.article,
            name: detail.name,
            material: detail.material,
            size: detail.size,
            totalQuantity: detail.totalNumber,
            readyForProcessing,
            distributed,
            completed,
          });
        }

        // Учитываем количество из УПАК в общем количестве
        const currentDetail = detailsMap.get(detail.id);
        currentDetail.totalQuantity += ypakDetail.quantity;
        detailsMap.set(detail.id, currentDetail);
      }
    }

    // Преобразуем Map в массив для ответа
    return Array.from(detailsMap.values());
  }
}
