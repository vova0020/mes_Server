import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  MachineResponseDto,
  MachineStatus,
  OrderDetailsResponseDto,
  PalletsResponseDto,
  SegmentOrdersResponseDto,
} from '../dto/machineSmen.dto';

@Injectable()
export class MachinSmenService {
  constructor(private prisma: PrismaService) {}

  /**
   * Получить подробную информацию о станке по его ID
   */
  async getMachineById(id: number): Promise<MachineResponseDto> {
    const machine = await this.prisma.machine.findUnique({
      where: { id },
      include: {
        segment: true,
      },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${id} не найден`);
    }

    return {
      id: machine.id,
      name: machine.name,
      status: machine.status,
      recommendedLoad: machine.recommendedLoad,
      noShiftAssignment: machine.noShiftAssignment,
      segmentId: machine.segmentId,
      segmentName: machine.segment?.name || null,
    };
  }

  /**
   * Обновить статус станка
   */
  async updateMachineStatus(
    machineId: number,
    status: MachineStatus,
  ): Promise<MachineResponseDto> {
    // Проверяем существует ли станок
    const existingMachine = await this.prisma.machine.findUnique({
      where: { id: machineId },
    });

    if (!existingMachine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    // Обновляем статус станка
    const updatedMachine = await this.prisma.machine.update({
      where: { id: machineId },
      data: { status },
      include: {
        segment: true,
      },
    });


    return {
      id: updatedMachine.id,
      name: updatedMachine.name,
      status: updatedMachine.status,
      recommendedLoad: updatedMachine.recommendedLoad,
      noShiftAssignment: updatedMachine.noShiftAssignment,
      segmentId: updatedMachine.segmentId,
      segmentName: updatedMachine.segment?.name || null,
    };
  }

  /**
   * Получить все заказы для конкретного производственного участка
   */
  async getSegmentOrders(segmentId: number): Promise<SegmentOrdersResponseDto> {
    // Сначала проверяем, существует ли участок
    const segment = await this.prisma.productionSegment.findUnique({
      where: { id: segmentId },
    });

    if (!segment) {
      throw new NotFoundException(
        `Производственный участок с ID ${segmentId} не найден`,
      );
    }

    // Получаем только незавершенные заказы
    const activeOrders = await this.prisma.productionOrder.findMany({
      where: {
        completed: false, // Фильтруем только незавершенные заказы
      },
      select: { id: true },
    });

    if (activeOrders.length === 0) {
      // Если нет активных заказов, сразу возвращаем пустой результат
      return { orders: [] };
    }

    const activeOrderIds = activeOrders.map((order) => order.id);

    // Получаем этапы процесса, связанные с этим участком
    const segmentProcessSteps = await this.prisma.segmentProcessStep.findMany({
      where: { segmentId },
      include: { processStep: true },
    });

    const processStepIds = segmentProcessSteps.map(
      (step) => step.processStepId,
    );

    // Получаем все детали, у которых есть операции, требующие обработки на этих этапах
    const detailsWithStatus = await this.prisma.detailSegmentStatus.findMany({
      where: { segmentId },
      select: { detailId: true },
    });

    // Получаем все заказы, связанные с этими деталями
    const detailIds = detailsWithStatus.map((d) => d.detailId);

    // Получаем УПАК-и с деталями, которые обрабатываются на этом участке
    // Дополнительно фильтруем по активным заказам
    const ypaksWithDetails = await this.prisma.productionYpakDetail.findMany({
      where: {
        detailId: { in: detailIds },
        ypak: {
          orderId: { in: activeOrderIds }, // Используем фильтр по ID активных заказов
        },
      },
      include: {
        ypak: {
          include: {
            order: true,
          },
        },
      },
    });

    // Извлекаем уникальные заказы из УПАК-ов
    const uniqueOrdersMap = new Map();
    ypaksWithDetails.forEach((ypakDetail) => {
      const order = ypakDetail.ypak.order;
      uniqueOrdersMap.set(order.id, order);
    });

    const orders = Array.from(uniqueOrdersMap.values());

    return {
      orders: orders.map((order) => ({
        id: order.id,
        runNumber: order.runNumber,
        name: order.name,
        progress: order.progress,
      })),
    };
  }

  /**
   * Получить все детали для конкретного заказа и участка
   * с корректным подсчетом totalReadyForProcessing и totalCompleted
   */
  async getOrderDetails(
    orderId: number,
    segmentId: number,
  ): Promise<OrderDetailsResponseDto> {
    // Проверяем, существует ли заказ
    const order = await this.prisma.productionOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException(`Заказ с ID ${orderId} не найден`);
    }

    // Проверяем, существует ли участок
    const segment = await this.prisma.productionSegment.findUnique({
      where: { id: segmentId },
      include: {
        processSteps: {
          include: {
            processStep: true,
          },
        },
      },
    });

    if (!segment) {
      throw new NotFoundException(
        `Производственный участок с ID ${segmentId} не найден`,
      );
    }

    // Получаем все УПАК-и, связанные с этим заказом
    const ypaks = await this.prisma.productionYpak.findMany({
      where: { orderId },
      include: {
        details: {
          include: {
            detail: true,
          },
        },
      },
    });

    // Если УПАКов нет, возвращаем пустой массив
    if (ypaks.length === 0) {
      return { details: [] };
    }

    // Формируем список деталей из всех УПАКов с подсчетом количества
    const detailsMap = new Map();

    // Получаем этапы процесса для этого участка
    const segmentProcessStepIds = segment.processSteps.map(
      (step) => step.processStepId,
    );

    // Проходим по всем УПАКам и деталям в них
    for (const ypak of ypaks) {
      for (const ypakDetail of ypak.details) {
        const detail = ypakDetail.detail;

        // Проверяем, относится ли деталь к нужному сегменту
        const detailSegmentStatus =
          await this.prisma.detailSegmentStatus.findFirst({
            where: {
              detailId: detail.id,
              segmentId,
            },
          });

        // Если деталь не относится к этому сегменту, пропускаем
        if (!detailSegmentStatus) {
          continue;
        }

        // Если детали еще нет в нашей карте, добавляем её
        if (!detailsMap.has(detail.id)) {
          // Определяем, является ли текущий участок первым в маршруте для детали
          const isFirstSegment = await this.isFirstSegmentForDetail(
            detail.id,
            segmentId,
          );

          // Определяем предыдущий участок для детали
          const previousSegment = await this.getPreviousSegmentForDetail(
            detail.id,
            segmentId,
          );

          // Вычисляем readyForProcessing и completed в зависимости от позиции участка в маршруте
          let readyForProcessing = 0;
          let completed = 0;

          // Получаем все поддоны для данной детали
          const pallets = await this.prisma.productionPallets.findMany({
            where: { detailId: detail.id },
            include: {
              detailOperations: {
                include: {
                  processStep: true,
                },
                orderBy: {
                  startedAt: 'desc',
                },
              },
              currentStep: true,
            },
          });

          if (isFirstSegment) {
            // Если это первый участок, то все поддоны готовы к обработке
            readyForProcessing = pallets.reduce(
              (sum, pallet) => sum + pallet.quantity,
              0,
            );

            // Из них вычитаем те, что уже обработаны на этом участке
            for (const pallet of pallets) {
              // Проверяем операции поддона
              const operations = pallet.detailOperations.filter((op) =>
                segmentProcessStepIds.includes(op.processStepId),
              );

              if (operations.length > 0) {
                const latestOperation = operations[0]; // Первая операция - самая последняя
                if (latestOperation.status === 'COMPLETED') {
                  completed += pallet.quantity;
                  readyForProcessing -= pallet.quantity; // Уменьшаем количество готовых к обработке
                }
              }
            }
          } else if (previousSegment) {
            // Если это НЕ первый участок, учитываем только поддоны, прошедшие предыдущий участок
            for (const pallet of pallets) {
              // Находим операции для предыдущего участка
              const previousSegmentOperations =
                await this.getOperationsForSegment(
                  pallet.id,
                  previousSegment.id,
                );

              // Если есть завершенные операции на предыдущем участке, поддон готов к обработке на текущем
              const hasCompletedPreviousOperations =
                previousSegmentOperations.some(
                  (op) => op.status === 'COMPLETED',
                );

              if (hasCompletedPreviousOperations) {
                readyForProcessing += pallet.quantity;

                // Проверяем, завершена ли обработка на текущем участке
                const currentSegmentOperations =
                  await this.getOperationsForSegment(pallet.id, segmentId);

                const isCompletedOnCurrentSegment =
                  currentSegmentOperations.some(
                    (op) => op.status === 'COMPLETED',
                  );

                if (isCompletedOnCurrentSegment) {
                  completed += pallet.quantity;
                  readyForProcessing -= pallet.quantity; // Уменьшаем количество готовых к обработке
                }
              }
            }
          }

          detailsMap.set(detail.id, {
            id: detail.id,
            article: detail.article,
            name: detail.name,
            material: detail.material,
            size: detail.size,
            totalNumber: detail.totalNumber,
            isCompletedForSegment: detailSegmentStatus.isCompleted,
            readyForProcessing,
            completed,
          });
        }

        // Увеличиваем общее количество для этой детали
        const currentDetail = detailsMap.get(detail.id);
        currentDetail.totalNumber += ypakDetail.quantity;
        detailsMap.set(detail.id, currentDetail);
      }
    }

    return {
      details: Array.from(detailsMap.values()),
    };
  }

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
