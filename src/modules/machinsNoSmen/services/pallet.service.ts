import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { OperationStatus } from '@prisma/client';

@Injectable()
export class PalletService {
  private readonly logger = new Logger(PalletService.name);
  constructor(private prisma: PrismaService) {}

  /**
   * Начать обработку поддона на станке
   * @param palletId - ID поддона
   * @param machineId - ID станка
   * @param operatorId - ID оператора (опционально)
   */
  async startPalletProcessing(
    palletId: number,
    machineId: number,
    operatorId?: number,
  ) {
    // Проверяем существование поддона
    const pallet = await this.prisma.productionPallets.findUnique({
      where: { id: palletId },
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
        currentStep: true,
      },
    });

    if (!pallet) {
      this.logger.error(`Поддон с ID ${palletId} не найден`);
      throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
    }

    // Проверяем существование станка
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        processSteps: {
          include: {
            processStep: true,
          },
        },
      },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    // Проверяем, что поддон имеет текущий этап обработки
    let currentStepId = pallet.currentStepId;
    
    // Если текущий этап не указан, но есть маршрут, пытаемся определить первый этап
    if (!currentStepId && pallet.detail.route && pallet.detail.route.steps.length > 0) {
      // Берем первый этап из маршрута
      const firstRouteStep = pallet.detail.route.steps[0];
      currentStepId = firstRouteStep.processStepId;
      
      this.logger.log(`Для поддона ${palletId} автоматически установлен первый этап обработки: ${currentStepId}`);
      
      // Обновляем поддон с первым этапом обработки
      await this.prisma.productionPallets.update({
        where: { id: palletId },
        data: { currentStepId },
      });
    }
    
    if (!currentStepId) {
      const errorMsg = `У поддона ${palletId} не указан текущий этап обработки. Невозможно начать обработку`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Получаем список ID этапов, которые может выполнять станок
    const processStepIds = machine.processSteps.map(
      (step) => step.processStepId,
    );

    // Проверяем, включен ли текущий этап поддона в список этапов, которые может выполнять станок
    const canProcessStep = processStepIds.includes(currentStepId);

    // Дополнительно логгируем информацию для отладки
    this.logger.debug(
      `Станок ${machineId} может выполнять этапы: ${processStepIds.join(', ')}`,
    );
    this.logger.debug(`Текущий этап поддона ${palletId}: ${currentStepId}`);
    this.logger.debug(`Может ли станок выполнить этап: ${canProcessStep}`);

    if (!canProcessStep) {
      const errorMsg = `Станок ${machineId} не может выполнять текущий этап обработки поддона ${palletId}. Текущий этап: ${currentStepId}, доступные этапы: ${processStepIds.join(', ')}`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Проверяем, что поддон еще не находится в обработке
    const existingOperation = await this.prisma.detailOperation.findFirst({
      where: {
        productionPalletId: palletId,
        processStepId: currentStepId,
        status: { in: ['ON_MACHINE', 'IN_PROGRESS'] },
      },
    });

    if (existingOperation) {
      const errorMsg = `Поддон ${palletId} уже находится в обработке на другом станке`;
      this.logger.error(errorMsg);
      throw new Error(errorMsg);
    }

    // Определяем номер шага в маршруте
    let stepSequenceInRoute: number | undefined = undefined;

    if (pallet.detail.route) {
      const routeStep = pallet.detail.route.steps.find(
        (step) => step.processStepId === currentStepId,
      );

      if (routeStep) {
        // Явно приводим к типу number, так как sequence в модели RouteStep это number
        stepSequenceInRoute = routeStep.sequence;
      }
    }

    // Создаем запись об операции
    return this.prisma.detailOperation.create({
      data: {
        productionPalletId: palletId,
        processStepId: currentStepId,
        machineId: machineId,
        operatorId: operatorId || undefined,
        status: 'IN_PROGRESS',
        quantity: pallet.quantity,
        stepSequenceInRoute: stepSequenceInRoute,
        startedAt: new Date(),
      },
      include: {
        productionPallet: {
          include: {
            detail: true,
          },
        },
        processStep: true,
        machine: true,
        operator: {
          include: {
            details: true,
          },
        },
      },
    });
  }

  /**
   * Завершить обработку поддона на станке
   * @param palletId - ID поддона
   * @param machineId - ID станка
   * @param operatorId - ID оператора, завершающего обработку (опционально)
   * @param segmentId - ID производственного участка (опционально)
   */
  async completePalletProcessing(
    palletId: number,
    machineId: number,
    operatorId?: number,
    segmentId?: number,
  ) {
    // Проверяем существование поддона
    const pallet = await this.prisma.productionPallets.findUnique({
      where: { id: palletId },
      include: {
        detail: {
          include: {
            route: {
              include: {
                steps: {
                  orderBy: {
                    sequence: 'asc',
                  },
                  include: {
                    processStep: true,
                  },
                },
              },
            },
          },
        },
        currentStep: true,
      },
    });

    if (!pallet) {
      throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
    }

    // Проверяем существование станка
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        segment: true,
        processSteps: {
          include: {
            processStep: true,
          },
        },
      },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    // Если segmentId не указан, пытаемся использовать ID сегмента из станка
    const finalSegmentId = segmentId || machine.segmentId;

    if (!finalSegmentId) {
      this.logger.warn(
        `Для станка ${machineId} не указан сегмент. Статусы по сегментам не будут обновлены.`,
      );
    }

    // Проверяем, что поддон имеет текущий этап обработки
    const currentStepId = pallet.currentStepId;
    if (!currentStepId) {
      throw new Error(
        `У поддона ${palletId} не указан текущий этап обработки. Невозможно завершить о��работку`,
      );
    }

    // Находим операцию, которая относится к данному поддону, станку и текущему этапу обработки
    const operation = await this.prisma.detailOperation.findFirst({
      where: {
        productionPalletId: palletId,
        machineId: machineId,
        processStepId: currentStepId,
        status: { in: ['ON_MACHINE', 'IN_PROGRESS'] }, // Операция должна быть активной
      },
      include: {
        productionPallet: {
          include: {
            detail: {
              include: {
                route: {
                  include: {
                    steps: {
                      orderBy: {
                        sequence: 'asc',
                      },
                      include: {
                        processStep: true,
                      },
                    },
                  },
                },
              },
            },
            currentStep: true,
          },
        },
        processStep: true,
        machine: {
          include: {
            segment: true,
          },
        },
        operator: true,
      },
    });

    if (!operation) {
      throw new Error(
        `Не найдена активная операция для поддона ${palletId} на станке ${machineId} с текущим этапом ${currentStepId}`,
      );
    }

    // Если оператор не указан при завершении, используем оператора, который начал операцию
    const finalOperatorId = operatorId || operation.operatorId;

    if (!finalOperatorId) {
      throw new Error('Для завершения операции требуется указать оператора');
    }

    // Определяем следующий этап обработки, если есть маршрут
    let nextStepId: number | null = null;
    const detail = pallet.detail;
    const route = detail.route;

    if (route && operation.stepSequenceInRoute !== null) {
      // Ищем следующий шаг в маршруте
      const nextRouteStep = route.steps.find(
        (step) => step.sequence === (operation.stepSequenceInRoute || 0) + 1,
      );

      if (nextRouteStep) {
        nextStepId = nextRouteStep.processStepId;
        this.logger.debug(`Найден следующий этап обработки по маршруту: ${nextStepId}`);
      } else {
        this.logger.debug(`Следующий этап в маршруте не найден, обработка завершена`);
      }
    } else {
      // Если у детали нет маршрута или stepSequenceInRoute не установлен,
      // пытаемся найти любой подходящий этап обработки
      this.logger.debug(`Маршрут не определен, поиск подходящего следующего этапа`);
      
      // Получаем все этапы, которые может обрабатывать сегмент станка
      if (machine.segmentId) {
        const segment = await this.prisma.productionSegment.findUnique({
          where: { id: machine.segmentId },
          include: {
            processSteps: {
              include: {
                processStep: true
              },
              orderBy: {
                processStep: {
                  sequence: 'asc'
                }
              }
            }
          }
        });
        
        if (segment && segment.processSteps.length > 0) {
          // Находим текущий этап в списке
          const currentStepIndex = segment.processSteps.findIndex(
            (segmentStep) => segmentStep.processStepId === currentStepId
          );
          
          // Если текущий этап найден и есть следующий, устанавливаем его
          if (currentStepIndex >= 0 && currentStepIndex < segment.processSteps.length - 1) {
            nextStepId = segment.processSteps[currentStepIndex + 1].processStepId;
            this.logger.debug(`Найден следующий этап по сегменту: ${nextStepId}`);
          }
        }
      }
    }

    // Транзакция для атомарного обновления
    return this.prisma.$transaction(async (prisma) => {
      // Обновляем статус операции
      const updatedOperation = await prisma.detailOperation.update({
        where: { id: operation.id },
        data: {
          status: 'COMPLETED',
          operatorId: finalOperatorId,
          completedAt: new Date(),
          isCompletedForDetail: true,
        },
      });

      // Обновляем поддон, устанавливая следующий этап обработки
      const updatedPallet = await prisma.productionPallets.update({
        where: { id: pallet.id },
        data: {
          currentStepId: nextStepId,
        },
        include: {
          detail: true,
          currentStep: true,
        },
      });

      // Если есть сегмент, обновляем статус обработки для этого сегмента
      if (finalSegmentId) {
        // Проверяем, есть ли запись статуса для этой детали и сегмента
        const statusExists = await prisma.detailSegmentStatus.findUnique({
          where: {
            detailId_segmentId: {
              detailId: detail.id,
              segmentId: finalSegmentId,
            },
          },
        });

        // Если записи нет, создаем
        if (!statusExists) {
          await prisma.detailSegmentStatus.create({
            data: {
              detailId: detail.id,
              segmentId: finalSegmentId,
              isCompleted: true,
              completedAt: new Date(),
            },
          });
        } else {
          // Иначе обновляем существующую запись
          await prisma.detailSegmentStatus.update({
            where: {
              detailId_segmentId: {
                detailId: detail.id,
                segmentId: finalSegmentId,
              },
            },
            data: {
              isCompleted: true,
              completedAt: new Date(),
            },
          });
        }
      }

      return {
        operation: updatedOperation,
        pallet: updatedPallet,
        nextStep: nextStepId
          ? 'Установлен следующий этап обработки'
          : 'Обработка завершена',
      };
    });
  }

  /**
   * Получить информацию о поддоне
   * @param palletId - ID поддона
   */
  async getPalletInfo(palletId: number) {
    return this.prisma.productionPallets.findUnique({
      where: { id: palletId },
      include: {
        detail: true,
        currentStep: true,
        detailOperations: {
          orderBy: {
            startedAt: 'desc',
          },
          take: 5,
          include: {
            processStep: true,
            machine: true,
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
        },
        bufferCell: {
          include: {
            buffer: true,
          },
        },
      },
    });
  }

  /**
   * Получить список поддонов, готовых к обработке на конкретном станке
   * @param machineId - ID станка
   */
  async getPalletsForMachine(machineId: number) {
    // Получаем информацию о станке и его этапах обработки
    const machine = await this.prisma.machine.findUnique({
      where: { id: machineId },
      include: {
        processSteps: {
          include: {
            processStep: true,
          },
        },
      },
    });

    if (!machine) {
      throw new Error(`Станок с ID ${machineId} не найден`);
    }

    // Получаем ID этапов, которые может выполнять станок
    const processStepIds = machine.processSteps.map(
      (step) => step.processStepId,
    );

    if (processStepIds.length === 0) {
      return [];
    }

    // Находим поддоны, у которых текущий этап обработки совпадает
    // с одним из этапов, которые может выполнять станок
    return this.prisma.productionPallets.findMany({
      where: {
        currentStepId: {
          in: processStepIds,
        },
        // Проверяем, что поддон не находится в обработке на другом станке
        detailOperations: {
          none: {
            status: { in: ['ON_MACHINE', 'IN_PROGRESS'] },
            processStepId: {
              in: processStepIds,
            },
          },
        },
      },
      include: {
        detail: true,
        currentStep: true,
        bufferCell: {
          include: {
            buffer: true,
          },
        },
      },
    });
  }

  /**
   * Переместить поддон в буфер
   * Теперь просто перемещает физически без изменения статуса операции
   */
  async movePalletToBuffer(palletId: number, bufferCellId: number) {
    this.logger.log(
      `Перемещение поддона ${palletId} в буфер (ячейка ${bufferCellId})`,
    );

    try {
      // Проверяем существование поддона
      const pallet = await this.prisma.productionPallets.findUnique({
        where: { id: palletId },
        include: {
          detailOperations: {
            where: {
              status: OperationStatus.IN_PROGRESS,
            },
            take: 1,
          },
          // Добавляем информацию о текущей ячейке буфера (если есть)
          bufferCell: true,
        },
      });

      if (!pallet) {
        throw new NotFoundException(`Поддон с ID ${palletId} не найден`);
      }

      // Проверяем существование ячейки буфера
      const bufferCell = await this.prisma.bufferCell.findUnique({
        where: { id: bufferCellId },
        include: {
          // Получаем список всех поддонов в этой ячейке для проверки вместимости
          pallets: true,
        },
      });

      if (!bufferCell) {
        throw new NotFoundException(
          `Ячейка буфера с ID ${bufferCellId} не найдена`,
        );
      }

      // Проверяем, что ячейка буфера доступна или уже имеет поддоны, но еще не заполнена
      if (
        bufferCell.status !== 'AVAILABLE' &&
        bufferCell.status !== 'OCCUPIED'
      ) {
        throw new Error(
          `Ячейка буфера ${bufferCell.code} недоступна. Текущий статус: ${bufferCell.status}`,
        );
      }

      // Проверяем, не переполнена ли ячейка
      // Учитываем, что если поддон уже находится в этой ячейке, его не нужно учитывать дважды
      const isCurrentPalletInThisCell = pallet.bufferCellId === bufferCell.id;
      const effectivePalletsCount = isCurrentPalletInThisCell
        ? bufferCell.pallets.length
        : bufferCell.pallets.length + 1;

      if (effectivePalletsCount > bufferCell.capacity) {
        throw new Error(
          `Ячейка буфера ${bufferCell.code} уже заполнена до максимальной вместимости (${bufferCell.capacity})`,
        );
      }

      // Используем транзакцию для атомарного выполнения всех операций
      return await this.prisma.$transaction(async (prisma) => {
        // Если поддон уже был в другой ячейке, обновляем статус той ячейки
        if (pallet.bufferCellId && pallet.bufferCellId !== bufferCellId) {
          const oldBufferCell = await prisma.bufferCell.findUnique({
            where: { id: pallet.bufferCellId },
            include: { pallets: true },
          });

          if (oldBufferCell) {
            // После перемещения поддона в новую ячейку, в старой ячейке останется на 1 поддон меньше
            const oldCellRemainingPallets = oldBufferCell.pallets.length - 1;

            // Если после перемещения в старой ячейке не останется поддонов, меняем её статус на AVAILABLE
            if (oldCellRemainingPallets <= 0) {
              await prisma.bufferCell.update({
                where: { id: pallet.bufferCellId },
                data: { status: 'AVAILABLE' },
              });
              this.logger.log(
                `Ячейка ${pallet.bufferCellId} освобождена и имеет статус AVAILABLE`,
              );
            }
            // Иначе оставляем статус OCCUPIED
            else {
              this.logger.log(
                `В ячейке ${pallet.bufferCellId} осталось ${oldCellRemainingPallets} поддонов`,
              );
            }
          }
        }

        // Перемещаем поддон в новую ячейку буфера
        const updatedPallet = await prisma.productionPallets.update({
          where: { id: palletId },
          data: { bufferCellId: bufferCellId },
          include: {
            detailOperations: {
              where: {
                status: OperationStatus.IN_PROGRESS,
              },
              include: {
                processStep: true,
              },
              orderBy: {
                startedAt: 'desc',
              },
              take: 1,
            },
          },
        });

        // Определяем, нужно ли обновлять статус новой ячейки
        // Если количество поддонов равно вместимости - ставим OCCUPIED
        // Если меньше - оставляем AVAILABLE
        const newStatus =
          effectivePalletsCount >= bufferCell.capacity
            ? 'OCCUPIED'
            : 'AVAILABLE';

        // Обновляем статус новой ячейки буфера
        await prisma.bufferCell.update({
          where: { id: bufferCellId },
          data: { status: newStatus },
        });

        const statusMessage =
          newStatus === 'OCCUPIED'
            ? 'ячейка полностью заполнена'
            : 'ячейка имеет свободное место';
        this.logger.log(
          `Поддон ${palletId} перемещен в ячейку буфера ${bufferCellId}, ${statusMessage}`,
        );

        return {
          message: 'Поддон успешно перемещен в буфер',
          pallet: updatedPallet,
          operation: pallet.detailOperations[0] || null,
        };
      });
    } catch (error) {
      this.logger.error(
        `Ошибка при перемещении поддона в буфер: ${error.message}`,
      );
      throw error;
    }
  }
}
