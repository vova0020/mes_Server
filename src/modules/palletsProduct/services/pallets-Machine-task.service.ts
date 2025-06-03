import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { PalletsResponseDto } from '../dto/machineNoSmen.dto';
import { EventsGateway } from 'src/modules/websocket/events.gateway';

@Injectable()
export class PalletsMachineTaskService {
  constructor(
    private prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) {}

  /**
   * Получить все поддоны по ID детали
   * @param detailId ID детали
   * @param segmentId ID производственного участка
   * @returns Список поддонов с информацией о буфере, станке и текущей операции,
   * а также о прохождении маршрута
   */
  async getPalletsByDetailId(
    detailId: number,
    segmentId: number,
  ): Promise<PalletsResponseDto> {
    // Проверяем, существует ли деталь
    const detail = await this.prisma.productionDetail.findUnique({
      where: { id: detailId },
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
    });

    if (!detail) {
      throw new NotFoundException(`Деталь с ID ${detailId} не найдена`);
    }

    // Проверяем, существует ли участок
    const segment = await this.prisma.productionSegment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      throw new NotFoundException(
        `Производственный участок с ID ${segmentId} не найден`,
      );
    }

    // Получаем все поддоны для указанной детали
    const pallets = await this.prisma.productionPallets.findMany({
      where: {
        detailId,
      },
      include: {
        detail: true, // Включаем данные о детали
        currentStep: true, // Включаем данные о текущем шаге
        // Включаем данные о ячейке буфера (если поддон находится в буфере)
        bufferCell: {
          include: {
            buffer: true, // Включаем данные о буфере для получения его имени
          },
        },
        // Включаем данные о операциях с инфо��мацией о станке и шаге
        detailOperations: {
          include: {
            machine: true, // Включаем данные о станке
            processStep: true, // Включаем данные о шаге процесса
            operator: {
              include: {
                details: true,
              },
            },
            master: {
              include: {
                details: true,
              },
            },
          },
          orderBy: {
            startedAt: 'desc', // Сортируем по дате начала, чтобы получить самую последнюю операцию
          },
        },
      },
    });

    // Вычисляем распределение по статусам для всей детали
    let totalReadyForProcessing = 0;
    let totalCompleted = 0;

    // Получаем статус детали для текущего сегмента
    const detailSegmentStatus = await this.prisma.detailSegmentStatus.findFirst(
      {
        where: {
          detailId,
          segmentId, // Используем переданный segmentId
        },
      },
    );

    // Преобразуем да��ные в формат DTO
    const palletDtos = await Promise.all(
      pallets.map(async (pallet) => {
        // Получаем текущую операцию и связанный с ней станок (если есть)
        const currentOperation =
          pallet.detailOperations.length > 0
            ? pallet.detailOperations[0]
            : null;
        const machine = currentOperation?.machine || null;

        // Определяем текущий сегмент для поддона на основе текущего шага процесса
        const currentStepId = pallet.currentStepId;

        // Правильное определение типов для переменных
        let currentPalletSegment: {
          id: number;
          name: string;
          createdAt: Date;
          updatedAt: Date;
          bufferId: number | null;
          lineId: number;
        } | null = null;

        let nextSegment: {
          id: number;
          name: string;
          createdAt: Date;
          updatedAt: Date;
          bufferId: number | null;
          lineId: number;
        } | null = null;

        if (currentStepId) {
          // Находим сегмент, который обрабатывает этот шаг
          const segmentProcessStep =
            await this.prisma.segmentProcessStep.findFirst({
              where: { processStepId: currentStepId },
              include: { segment: true },
            });

          if (segmentProcessStep) {
            currentPalletSegment = segmentProcessStep.segment;

            // Определяем следующий сегмент в маршруте
            if (detail.route) {
              const currentStepIndex = detail.route.steps.findIndex(
                (step) => step.processStepId === currentStepId,
              );

              if (
                currentStepIndex !== -1 &&
                currentStepIndex < detail.route.steps.length - 1
              ) {
                const nextStepId =
                  detail.route.steps[currentStepIndex + 1].processStepId;
                const nextSegmentProcessStep =
                  await this.prisma.segmentProcessStep.findFirst({
                    where: { processStepId: nextStepId },
                    include: { segment: true },
                  });

                if (nextSegmentProcessStep) {
                  nextSegment = nextSegmentProcessStep.segment;
                }
              }
            }
          }
        }

        // Определяем, является ли текущий сегмент первым в маршруте
        const isFirstSegmentInRoute =
          await this.isFirstSegmentForPallet(pallet);

        // Проверяем, завершены ли все предыдущие сегменты в маршруте
        const hasCompletedPreviousSegments =
          await this.hasCompletedPreviousSegments(
            pallet,
            currentPalletSegment?.id || segmentId, // Используем segmentId если currentPalletSegment не определен
          );

        return {
          id: pallet.id,
          name: pallet.name,
          quantity: pallet.quantity,
          detail: {
            id: pallet.detail.id,
            article: pallet.detail.article,
            name: pallet.detail.name,
            material: pallet.detail.material,
            size: pallet.detail.size,
            totalNumber: pallet.detail.totalNumber,
            isCompletedForSegment: detailSegmentStatus?.isCompleted || false,
            readyForProcessing: totalReadyForProcessing,
            completed: totalCompleted,
          },
          currentStepId: pallet.currentStepId,
          currentStepName: pallet.currentStep?.name || null,
          bufferCell: pallet.bufferCell
            ? {
                id: pallet.bufferCell.id,
                code: pallet.bufferCell.code,
                bufferId: pallet.bufferCell.bufferId,
                bufferName: pallet.bufferCell.buffer.name,
              }
            : null,
          // Добавляем информацию о станке
          machine: machine
            ? {
                id: machine.id,
                name: machine.name,
                status: machine.status,
              }
            : null,
          // Добавляем информацию о текущей операции
          currentOperation: currentOperation
            ? {
                id: currentOperation.id,
                status: currentOperation.status,
                completionStatus: currentOperation.completionStatus || null,
                startedAt: currentOperation.startedAt,
                completedAt: currentOperation.completedAt || null,
                processStep: currentOperation.processStep
                  ? {
                      id: currentOperation.processStep.id,
                      name: currentOperation.processStep.name,
                      sequence: currentOperation.processStep.sequence,
                    }
                  : null,
                operator: currentOperation.operator
                  ? {
                      id: currentOperation.operator.id,
                      username: currentOperation.operator.username,
                      fullName:
                        currentOperation.operator.details?.fullName || null,
                    }
                  : null,
                master: currentOperation.master
                  ? {
                      id: currentOperation.master.id,
                      username: currentOperation.master.username,
                      fullName:
                        currentOperation.master.details?.fullName || null,
                    }
                  : null,
              }
            : null,
          // Добавляем информацию о прохождении маршрута
          processingStatus: {
            isFirstSegmentInRoute,
            hasCompletedPreviousSegments,
            currentSegment: currentPalletSegment
              ? {
                  id: currentPalletSegment.id,
                  name: currentPalletSegment.name,
                }
              : {
                  // Если не определен текущий сегмент, используем переданный segmentId
                  id: segment.id,
                  name: segment.name,
                },
            nextSegment: nextSegment
              ? {
                  id: nextSegment.id,
                  name: nextSegment.name,
                }
              : null,
          },
        };
      }),
    );

    return {
      pallets: palletDtos,
      total: palletDtos.length,
    };
  }

  /**
   * Вспомогательный метод для определения, является ли сегмент первым в маршруте для детали
   */
  private async isFirstSegmentForDetail(
    detailId: number,
    segmentId: number,
  ): Promise<boolean> {
    // Получаем деталь с маршрутом
    const detail = await this.prisma.productionDetail.findUnique({
      where: { id: detailId },
      include: {
        route: {
          include: {
            steps: {
              orderBy: { sequence: 'asc' },
              include: { processStep: true },
            },
          },
        },
      },
    });

    if (!detail?.route) {
      return true; // Если нет маршрута, считаем первым
    }

    // Получаем первый шаг из маршрута
    const firstStep = detail.route.steps[0];
    if (!firstStep) {
      return true; // Если нет шагов, считаем первым
    }

    // Проверяем, принадлежит ли первый шаг маршрута этому сегменту
    const segmentProcessStep = await this.prisma.segmentProcessStep.findFirst({
      where: {
        segmentId: segmentId,
        processStepId: firstStep.processStepId,
      },
    });

    return segmentProcessStep !== null;
  }

  /**
   * Вспомогательный метод для определения, является ли сегмент первым в маршруте для поддона
   */
  private async isFirstSegmentForPallet(pallet: any): Promise<boolean> {
    if (!pallet.detail?.route) {
      return true; // Если нет маршрута, считаем первым
    }

    const currentStepId = pallet.currentStepId;
    if (!currentStepId) {
      return true; // Если нет текущего шага, считаем первым
    }

    // Находим сегмент для текущего шага
    const segmentProcessStep = await this.prisma.segmentProcessStep.findFirst({
      where: { processStepId: currentStepId },
      include: { segment: true },
    });

    if (!segmentProcessStep) {
      return true; // Если не нашли сегмент, считаем первым
    }

    return this.isFirstSegmentForDetail(
      pallet.detailId,
      segmentProcessStep.segmentId,
    );
  }

  /**
   * Вспомогательный метод для определения, завершены ли все предыдущие сегменты в маршруте
   */
  private async hasCompletedPreviousSegments(
    pallet: any,
    currentSegmentId: number,
  ): Promise<boolean> {
    if (!currentSegmentId || !pallet.detail?.route) {
      return true; // Если нет маршрута или текущего сегмента, считаем завершенными
    }

    const detail = await this.prisma.productionDetail.findUnique({
      where: { id: pallet.detailId },
      include: {
        route: {
          include: {
            steps: {
              orderBy: { sequence: 'asc' },
              include: { processStep: true },
            },
          },
        },
      },
    });

    if (!detail?.route?.steps?.length) {
      return true; // Если нет шагов в маршруте, считаем завершенными
    }

    // Правильная типизация массива сегментов
    type SegmentInRoute = {
      id: number;
      sequence: number;
    };

    // Получаем список сегментов в порядке маршрута
    const segmentsInRoute: SegmentInRoute[] = [];
    for (const step of detail.route.steps) {
      const segmentProcessStep = await this.prisma.segmentProcessStep.findFirst(
        {
          where: { processStepId: step.processStepId },
          include: { segment: true },
        },
      );

      if (segmentProcessStep) {
        // Проверяем, что сегмент еще не добавлен (избегаем дубликатов)
        if (
          !segmentsInRoute.some((s) => s.id === segmentProcessStep.segmentId)
        ) {
          segmentsInRoute.push({
            id: segmentProcessStep.segmentId,
            sequence: step.sequence,
          });
        }
      }
    }

    // Находим индекс текущего сегмента в маршруте
    const currentSegmentIndex = segmentsInRoute.findIndex(
      (s) => s.id === currentSegmentId,
    );

    if (currentSegmentIndex <= 0) {
      return true; // Если это первый сегмент или сегмент не найден в маршруте
    }

    // Проверяем, завершены ли все предыдущие сегменты
    for (let i = 0; i < currentSegmentIndex; i++) {
      const prevSegmentId = segmentsInRoute[i].id;

      // Получаем операции для предыдущего сегмента
      const operations = await this.getOperationsForSegment(
        pallet.id,
        prevSegmentId,
      );

      // Проверяем, есть ли хотя бы одна завершенная операция на этом сегменте
      const hasCompletedOperation = operations.some(
        (op) => op.status === 'COMPLETED',
      );

      if (!hasCompletedOperation) {
        return false; // Если хотя бы один предыдущий сегмент не завершен
      }
    }

    return true; // Все предыдущие сегменты завершены
  }

  /**
   * Вспомогательный метод для получения предыдущего сегмента для детали
   */
  private async getPreviousSegmentForDetail(
    detailId: number,
    currentSegmentId: number,
  ): Promise<any> {
    // Получаем деталь с маршрутом
    const detail = await this.prisma.productionDetail.findUnique({
      where: { id: detailId },
      include: {
        route: {
          include: {
            steps: {
              orderBy: { sequence: 'asc' },
              include: { processStep: true },
            },
          },
        },
      },
    });

    if (!detail?.route?.steps?.length) {
      return null; // Если нет маршрута или шагов, нет предыдущего сегмента
    }

    // Правильная типизация массива сегментов
    type SegmentWithRouteInfo = {
      id: number;
      segment: any;
      sequence: number;
    };

    // Получаем список сегментов в порядке маршрута
    const segmentsInRoute: SegmentWithRouteInfo[] = [];
    for (const step of detail.route.steps) {
      const segmentProcessStep = await this.prisma.segmentProcessStep.findFirst(
        {
          where: { processStepId: step.processStepId },
          include: { segment: true },
        },
      );

      if (segmentProcessStep) {
        // Проверяем, что сегмент еще не добавлен (избегаем дублик��тов)
        if (
          !segmentsInRoute.some((s) => s.id === segmentProcessStep.segmentId)
        ) {
          segmentsInRoute.push({
            id: segmentProcessStep.segmentId,
            segment: segmentProcessStep.segment,
            sequence: step.sequence,
          });
        }
      }
    }

    // Находим индекс текущего сегмента в маршруте
    const currentSegmentIndex = segmentsInRoute.findIndex(
      (s) => s.id === currentSegmentId,
    );

    if (currentSegmentIndex <= 0) {
      return null; // Если это первый сегмент или сегмент не найден в маршруте
    }

    // Возвращаем предыдущий сегмент
    return segmentsInRoute[currentSegmentIndex - 1];
  }
  /**
   * Вспомогательный метод для получения операций поддона для конкретного сегмента
   */
  private async getOperationsForSegment(
    palletId: number,
    segmentId: number,
  ): Promise<any[]> {
    // Получаем этапы процесса, связанные с сегментом
    const segmentProcessSteps = await this.prisma.segmentProcessStep.findMany({
      where: { segmentId },
      select: { processStepId: true },
    });

    const processStepIds = segmentProcessSteps.map(
      (step) => step.processStepId,
    );

    // Если нет этапов процесса, связанных с сегментом, возвращаем пустой массив
    if (processStepIds.length === 0) {
      return [];
    }

    // Получаем операции, связанные с поддоном и этапами процесса сегмента
    const operations = await this.prisma.detailOperation.findMany({
      where: {
        productionPalletId: palletId,
        processStepId: { in: processStepIds },
      },
      include: {
        processStep: true,
        machine: {
          include: {
            segment: true,
          },
        },
      },
      orderBy: {
        startedAt: 'desc', // Сортируем по времени начала, чтобы получить самые последние операции
      },
    });

    return operations;
  }
}
