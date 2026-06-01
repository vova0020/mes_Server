import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/shared/prisma.service';
import { SocketService } from 'src/modules/websocket/services/socket.service';

@Injectable()
export class CustomMachineMasterService {
  constructor(
    private prisma: PrismaService,
    private socketService: SocketService,
  ) {}

  async getMachineAssignments(machineId: number) {
    const machine = await this.prisma.machine.findUnique({
      where: { machineId },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    const assignments = await this.prisma.customMachineAssignment.findMany({
      where: {
        machineId,
        status: { in: ['PENDING', 'IN_PROGRESS', 'NOT_PROCESSED'] },
      },
      include: {
        customPallet: {
          include: {
            customPalletParts: {
              include: {
                customPart: {
                  include: {
                    customOrder: true,
                  },
                },
              },
            },
          },
        },
        assignmentParts: {
          include: {
            customPart: true,
          },
        },
      },
      orderBy: [{ priority: 'desc' }, { assignedAt: 'asc' }],
    });

    if (assignments.length === 0) {
      return {
        status: 'NO_ASSIGNMENTS',
        message: 'Нет заданий для данного станка',
        machineId,
        machineName: machine.machineName,
        orders: [],
      };
    }

    // Группируем по заказам
    const ordersMap = new Map();

    for (const assignment of assignments) {
      const pallet = assignment.customPallet;
      const firstPart = pallet.customPalletParts[0];
      const order = firstPart?.customPart.customOrder;

      if (!order) continue;

      if (!ordersMap.has(order.customOrderId)) {
        ordersMap.set(order.customOrderId, {
          orderId: order.customOrderId,
          orderName: order.orderName,
          totalPallets: 0,
          totalDetails: 0,
          pallets: [],
        });
      }

      const orderData = ordersMap.get(order.customOrderId);
      orderData.totalPallets++;

      const details = assignment.assignmentParts.map((ap) => {
        const part = ap.customPart;
        const size =
          part.finishedLength && part.finishedWidth
            ? `${part.finishedLength}x${part.finishedWidth}`
            : 'Не указан';

        orderData.totalDetails += Number(ap.plannedQuantity);

        return {
          assignmentPartId: ap.id,
          customPartId: ap.customPartId,
          partCode: part.partCode,
          partName: part.partName,
          materialName: part.materialName,
          size,
          plannedQuantity: Number(ap.plannedQuantity),
          processedQuantity: Number(ap.processedQuantity),
          status: ap.status,
        };
      });

      orderData.pallets.push({
        assignmentId: assignment.assignmentId,
        palletId: pallet.customPalletId,
        palletNumber: pallet.palletName,
        status: assignment.status,
        priority: assignment.priority,
        assignedAt: assignment.assignedAt.toISOString(),
        startedAt: assignment.startedAt?.toISOString() || null,
        completedAt: assignment.completedAt?.toISOString() || null,
        details,
      });
    }

    return {
      status: 'SUCCESS',
      message: `Найдено заданий: ${assignments.length}`,
      machineId,
      machineName: machine.machineName,
      orders: Array.from(ordersMap.values()),
    };
  }

  async startAssignment(assignmentId: number) {
    const assignment = await this.prisma.customMachineAssignment.findUnique({
      where: { assignmentId },
      include: {
        assignmentParts: true,
        customPallet: {
          include: {
            customPalletParts: {
              include: {
                customPart: {
                  include: {
                    customOrder: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Задание с ID ${assignmentId} не найдено`);
    }

    if (assignment.status === 'COMPLETED') {
      throw new BadRequestException('Задание уже завершено');
    }

    let orderStatusChanged = false;

    await this.prisma.$transaction(async (tx) => {
      // Обновляем статус задания
      await tx.customMachineAssignment.update({
        where: { assignmentId },
        data: {
          status: 'IN_PROGRESS',
          startedAt: assignment.startedAt || new Date(),
        },
      });

      // Обновляем статус ТОЛЬКО тех деталей, которые еще не в работе и не завершены
      await tx.customMachineAssignmentPart.updateMany({
        where: {
          assignmentId,
          status: { in: ['PENDING', 'NOT_PROCESSED'] },
        },
        data: { status: 'IN_PROGRESS' },
      });

      // Обновляем статус заказа на IN_PROGRESS если он еще не в работе
      const firstPart = assignment.customPallet.customPalletParts[0];
      if (firstPart) {
        const order = firstPart.customPart.customOrder;
        if (order && order.status !== 'IN_PROGRESS') {
          await tx.customOrder.update({
            where: { customOrderId: order.customOrderId },
            data: { status: 'IN_PROGRESS' },
          });
          orderStatusChanged = true;
        }
      }
    });

    // Отправляем WebSocket уведомления
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines'],
      'machine_task:event',
      { status: 'updated' },
    );
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines'],
      'pallet:event',
      { status: 'updated' },
    );

    if (orderStatusChanged) {
      this.socketService.emitToMultipleRooms(
        ['room:technologist', 'room:director'],
        'order:event',
        { status: 'updated' },
      );
    }

    return {
      status: 'SUCCESS',
      message: 'Работа над поддоном начата',
      assignmentId,
      startedAt: (assignment.startedAt || new Date()).toISOString(),
      orderStatusChanged,
    };
  }

  async completeAssignment(assignmentId: number) {
    const assignment = await this.prisma.customMachineAssignment.findUnique({
      where: { assignmentId },
      include: {
        assignmentParts: true,
        customPallet: {
          include: {
            customPalletParts: true,
          },
        },
        routeStage: true,
        machine: true,
      },
    });

    if (!assignment) {
      throw new NotFoundException(`Задание с ID ${assignmentId} не найдено`);
    }

    if (assignment.status === 'COMPLETED') {
      throw new BadRequestException('Задание уже завершено');
    }

    const completedAt = new Date();
    const startedAt = assignment.startedAt || new Date();
    const duration = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000);

    await this.prisma.$transaction(async (tx) => {
      // Обновляем processedQuantity и создаем прогресс для незавершенных деталей
      for (const part of assignment.assignmentParts) {
        if (part.status !== 'COMPLETED') {
          await tx.customMachineAssignmentPart.update({
            where: { id: part.id },
            data: {
              processedQuantity: part.plannedQuantity,
              status: 'COMPLETED',
            },
          });

          // Находим соответствующую запись в customPalletPart
          const palletPart = assignment.customPallet.customPalletParts.find(
            (pp) => pp.customPartId === part.customPartId,
          );

          if (palletPart) {
            // Проверяем, есть ли уже запись прогресса
            const existingProgress = await tx.customPalletPartStageProgress.findUnique({
              where: {
                palletPartId_routeStageId: {
                  palletPartId: palletPart.id,
                  routeStageId: assignment.routeStageId,
                },
              },
            });

            if (existingProgress) {
              await tx.customPalletPartStageProgress.update({
                where: { progressId: existingProgress.progressId },
                data: {
                  completedQuantity: {
                    increment: part.plannedQuantity,
                  },
                  status: 'COMPLETED',
                  completedAt,
                },
              });
            } else {
              await tx.customPalletPartStageProgress.create({
                data: {
                  palletPartId: palletPart.id,
                  routeStageId: assignment.routeStageId,
                  completedQuantity: part.plannedQuantity,
                  status: 'COMPLETED',
                  startedAt,
                  completedAt,
                },
              });
            }
          }

          // Создаем запись операции
          await tx.customMachineOperation.create({
            data: {
              machineId: assignment.machineId,
              customPalletId: assignment.customPalletId,
              customPartId: part.customPartId,
              routeStageId: assignment.routeStageId,
              quantityProcessed: part.plannedQuantity,
              startedAt,
              completedAt,
              duration,
            },
          });
        }
      }

      // Завершаем задание
      await tx.customMachineAssignment.update({
        where: { assignmentId },
        data: {
          status: 'COMPLETED',
          completedAt,
        },
      });
    });

    // Отправляем WebSocket уведомления
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines'],
      'machine_task:event',
      { status: 'updated' },
    );
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines'],
      'pallet:event',
      { status: 'updated' },
    );
    this.socketService.emitToMultipleRooms(
      ['room:technologist', 'room:director'],
      'order:stats',
      { status: 'updated' },
    );

    return {
      status: 'SUCCESS',
      message: 'Работа над поддоном завершена',
      assignmentId,
      completedAt: completedAt.toISOString(),
    };
  }

  async deleteAssignment(assignmentId: number) {
    const assignment = await this.prisma.customMachineAssignment.findUnique({
      where: { assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(`Задание с ID ${assignmentId} не найдено`);
    }

    await this.prisma.customMachineAssignment.delete({
      where: { assignmentId },
    });

    // Отправляем WebSocket уведомления
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines'],
      'machine_task:event',
      { status: 'updated' },
    );
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines'],
      'pallet:event',
      { status: 'updated' },
    );

    return {
      status: 'SUCCESS',
      message: 'Задание удалено',
    };
  }

  async startPart(assignmentPartId: number) {
    const part = await this.prisma.customMachineAssignmentPart.findUnique({
      where: { id: assignmentPartId },
      include: {
        assignment: {
          include: {
            customPallet: {
              include: {
                customPalletParts: {
                  include: {
                    customPart: {
                      include: {
                        customOrder: true,
                      },
                    },
                  },
                },
              },
            },
            routeStage: true,
          },
        },
      },
    });

    if (!part) {
      throw new NotFoundException(`Деталь с ID ${assignmentPartId} не найдена`);
    }

    if (part.status === 'COMPLETED') {
      throw new BadRequestException('Деталь уже завершена');
    }

    let palletStatusChanged = false;
    let orderStatusChanged = false;

    await this.prisma.$transaction(async (tx) => {
      // Обновляем статус детали
      await tx.customMachineAssignmentPart.update({
        where: { id: assignmentPartId },
        data: { status: 'IN_PROGRESS' },
      });

      // Находим соответствующую запись в customPalletPart
      const palletPart = part.assignment.customPallet.customPalletParts.find(
        (pp) => pp.customPartId === part.customPartId,
      );

      if (palletPart) {
        // Проверяем, есть ли уже запись прогресса
        const existingProgress = await tx.customPalletPartStageProgress.findUnique({
          where: {
            palletPartId_routeStageId: {
              palletPartId: palletPart.id,
              routeStageId: part.assignment.routeStageId,
            },
          },
        });

        if (!existingProgress) {
          // Создаем запись прогресса со статусом IN_PROGRESS
          await tx.customPalletPartStageProgress.create({
            data: {
              palletPartId: palletPart.id,
              routeStageId: part.assignment.routeStageId,
              completedQuantity: 0,
              status: 'IN_PROGRESS',
              startedAt: new Date(),
            },
          });
        } else if (existingProgress.status !== 'IN_PROGRESS' && existingProgress.status !== 'COMPLETED') {
          // Обновляем статус на IN_PROGRESS
          await tx.customPalletPartStageProgress.update({
            where: { progressId: existingProgress.progressId },
            data: {
              status: 'IN_PROGRESS',
              startedAt: existingProgress.startedAt || new Date(),
            },
          });
        }

        // Обновляем статус заказа на IN_PROGRESS если он еще не в работе
        const order = palletPart.customPart.customOrder;
        if (order && order.status !== 'IN_PROGRESS') {
          await tx.customOrder.update({
            where: { customOrderId: order.customOrderId },
            data: { status: 'IN_PROGRESS' },
          });
          orderStatusChanged = true;
        }
      }

      // Если поддон еще не в работе, переводим его в работу
      if (
        part.assignment.status === 'PENDING' ||
        part.assignment.status === 'NOT_PROCESSED'
      ) {
        await tx.customMachineAssignment.update({
          where: { assignmentId: part.assignmentId },
          data: {
            status: 'IN_PROGRESS',
            startedAt: new Date(),
          },
        });
        palletStatusChanged = true;
      }
    });

    // Отправляем WebSocket уведомления
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines'],
      'machine_task:event',
      { status: 'updated' },
    );

    if (palletStatusChanged) {
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines'],
        'pallet:event',
        { status: 'updated' },
      );
    }

    if (orderStatusChanged) {
      this.socketService.emitToMultipleRooms(
        ['room:technologist', 'room:director'],
        'order:event',
        { status: 'updated' },
      );
    }

    return {
      status: 'SUCCESS',
      message: palletStatusChanged
        ? 'Работа над деталью начата, поддон переведен в работу'
        : 'Работа над деталью начата',
      assignmentPartId,
      palletStatusChanged,
      orderStatusChanged,
    };
  }

  async completePart(assignmentPartId: number, processedQuantity: number) {
    const part = await this.prisma.customMachineAssignmentPart.findUnique({
      where: { id: assignmentPartId },
      include: {
        assignment: {
          include: {
            assignmentParts: true,
            customPallet: {
              include: {
                customPalletParts: {
                  where: {
                    customPartId: undefined, // будет заполнено ниже
                  },
                },
              },
            },
            routeStage: true,
            machine: true,
          },
        },
      },
    });

    if (!part) {
      throw new NotFoundException(`Деталь с ID ${assignmentPartId} не найдена`);
    }

    if (part.status === 'COMPLETED') {
      throw new BadRequestException('Деталь уже завершена');
    }

    const plannedQty = Number(part.plannedQuantity);
    if (processedQuantity > plannedQty) {
      throw new BadRequestException(
        `Обработанное количество (${processedQuantity}) превышает запланированное (${plannedQty})`,
      );
    }

    let palletCompleted = false;
    const completedAt = new Date();

    await this.prisma.$transaction(async (tx) => {
      // Обновляем статус детали в задании
      await tx.customMachineAssignmentPart.update({
        where: { id: assignmentPartId },
        data: {
          processedQuantity,
          status: 'COMPLETED',
        },
      });

      // Находим соответствующую запись в customPalletPart
      const palletPart = await tx.customPalletPart.findFirst({
        where: {
          customPalletId: part.assignment.customPalletId,
          customPartId: part.customPartId,
        },
      });

      if (palletPart) {
        // Проверяем, есть ли уже запись прогресса для этого этапа
        const existingProgress = await tx.customPalletPartStageProgress.findUnique({
          where: {
            palletPartId_routeStageId: {
              palletPartId: palletPart.id,
              routeStageId: part.assignment.routeStageId,
            },
          },
        });

        if (existingProgress) {
          // Обновляем существующую запись
          await tx.customPalletPartStageProgress.update({
            where: { progressId: existingProgress.progressId },
            data: {
              completedQuantity: {
                increment: processedQuantity,
              },
              status: 'COMPLETED',
              completedAt,
            },
          });
        } else {
          // Создаем новую запись прогресса
          await tx.customPalletPartStageProgress.create({
            data: {
              palletPartId: palletPart.id,
              routeStageId: part.assignment.routeStageId,
              completedQuantity: processedQuantity,
              status: 'COMPLETED',
              startedAt: part.assignment.startedAt || new Date(),
              completedAt,
            },
          });
        }
      }

      // Создаем запись операции в custom_machine_operations
      const startedAt = part.assignment.startedAt || new Date();
      const duration = Math.floor((completedAt.getTime() - startedAt.getTime()) / 1000); // в секундах

      await tx.customMachineOperation.create({
        data: {
          machineId: part.assignment.machineId,
          customPalletId: part.assignment.customPalletId,
          customPartId: part.customPartId,
          routeStageId: part.assignment.routeStageId,
          quantityProcessed: processedQuantity,
          startedAt,
          completedAt,
          duration,
          // operatorId можно добавить позже, если нужно отслеживать оператора
        },
      });

      // Проверяем, все ли детали завершены
      const allParts = part.assignment.assignmentParts;
      const allCompleted = allParts.every(
        (p) => p.id === assignmentPartId || p.status === 'COMPLETED',
      );

      // Если все детали завершены, завершаем поддон
      if (allCompleted) {
        await tx.customMachineAssignment.update({
          where: { assignmentId: part.assignmentId },
          data: {
            status: 'COMPLETED',
            completedAt,
          },
        });
        palletCompleted = true;
      }
    });

    // Отправляем WebSocket уведомления
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines'],
      'machine_task:event',
      { status: 'updated' },
    );

    if (palletCompleted) {
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines'],
        'pallet:event',
        { status: 'updated' },
      );
    }

    this.socketService.emitToMultipleRooms(
      ['room:technologist', 'room:director'],
      'order:stats',
      { status: 'updated' },
    );

    return {
      status: 'SUCCESS',
      message: palletCompleted
        ? 'Работа над деталью завершена, поддон завершен автоматически'
        : 'Работа над деталью завершена',
      assignmentPartId,
      processedQuantity,
      palletCompleted,
    };
  }

  async deletePart(assignmentPartId: number) {
    const part = await this.prisma.customMachineAssignmentPart.findUnique({
      where: { id: assignmentPartId },
    });

    if (!part) {
      throw new NotFoundException(`Деталь с ID ${assignmentPartId} не найдена`);
    }

    await this.prisma.customMachineAssignmentPart.delete({
      where: { id: assignmentPartId },
    });

    // Отправляем WebSocket уведомления
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines'],
      'machine_task:event',
      { status: 'updated' },
    );

    return {
      status: 'SUCCESS',
      message: 'Деталь удалена из задания',
    };
  }

  async reassignMachine(assignmentId: number, newMachineId: number) {
    const assignment = await this.prisma.customMachineAssignment.findUnique({
      where: { assignmentId },
    });

    if (!assignment) {
      throw new NotFoundException(`Задание с ID ${assignmentId} не найдено`);
    }

    const newMachine = await this.prisma.machine.findUnique({
      where: { machineId: newMachineId },
    });

    if (!newMachine) {
      throw new NotFoundException(`Станок с ID ${newMachineId} не найден`);
    }

    await this.prisma.customMachineAssignment.update({
      where: { assignmentId },
      data: { machineId: newMachineId },
    });

    // Отправляем WebSocket уведомления
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines'],
      'machine_task:event',
      { status: 'updated' },
    );
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines'],
      'machine:event',
      { status: 'updated' },
    );

    return {
      status: 'SUCCESS',
      message: 'Поддон переназначен на станок',
      newMachineId,
      newMachineName: newMachine.machineName,
    };
  }
}
