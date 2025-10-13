import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  MoveTaskToMachineDto,
  UpdateTaskStatusDto,
  AssignUserToTaskDto,
  SetTaskPriorityDto,
  StartTaskDto,
  CompleteTaskDto,
} from '../dto/packing-task-management.dto';
import {
  PackingAssignmentResponseDto,
  ProductionPackageInfo,
} from '../dto/packing-assignment-response.dto';
import { PackingTaskStatus, PackageStatus } from '@prisma/client';
import { SocketService } from '../../websocket/services/socket.service';

@Injectable()
export class PackingTaskManagementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly socketService: SocketService,
  ) {}

  // Отметить задание как взято в работу
  async markTaskAsInProgress(
    taskId: number,
    dto: StartTaskDto,
  ): Promise<PackingAssignmentResponseDto> {
    const existingTask = await this.prisma.packingTask.findUnique({
      where: { taskId },
    });

    if (!existingTask) {
      throw new NotFoundException(`Задание с ID ${taskId} не найдено`);
    }

    // Проверяем, что задание можно взять в работу
    if (existingTask.status !== PackingTaskStatus.PENDING) {
      throw new BadRequestException(
        `Задание должно иметь статус PENDING для взятия в работу. Текущий статус: ${existingTask.status}`,
      );
    }

    // Проверяем наличие достаточного количества деталей на поддонах
    await this.checkAvailablePartsForTask(
      existingTask.packageId,
      existingTask.assignedQuantity.toNumber(),
    );

    const updatedTask = await this.prisma.packingTask.update({
      where: { taskId },
      data: {
        status: PackingTaskStatus.IN_PROGRESS,
        machineId: dto.machineId,
      },
      include: {
        package: {
          include: {
            order: true,
          },
        },
        machine: true,
        assignedUser: {
          include: {
            userDetail: true,
          },
        },
      },
    });

    // Обновляем статус упаковки
    await this.updatePackageStatus(existingTask.packageId);

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:masterypack',
        'room:machinesypack',
      ],
      'package:event',
      { status: 'updated' },
    );
    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:masterypack',
        'room:machinesypack',
      ],
      'machine:event',
      { status: 'updated' },
    );

    this.socketService.emitToMultipleRooms(
      ['room:technologist', 'room:director'],
      'order:stats',
      { status: 'updated' },
    );
    // // Отправляем WebSocket уведомление о событии
    // this.socketService.emitToMultipleRooms(
    //   ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
    //   'package:event',
    //   { status: 'updated' },
    // );

    return this.mapToResponseDto(updatedTask);
  }

  // Отметить задание как выполнено
  async markTaskAsCompleted(
    taskId: number,
    dto: CompleteTaskDto,
  ): Promise<PackingAssignmentResponseDto> {
    const existingTask = await this.prisma.packingTask.findUnique({
      where: { taskId },
      include: {
        package: {
          include: {
            order: true,
            productionPackageParts: {
              include: {
                part: {
                  include: {
                    pallets: true,
                  },
                },
              },
            },
            palletAssignments: {
              include: {
                pallet: true,
              },
            },
          },
        },
      },
    });

    if (!existingTask) {
      throw new NotFoundException(`Задание с ID ${taskId} не найдено`);
    }

    if (existingTask.status === PackingTaskStatus.COMPLETED) {
      throw new BadRequestException('Задание уже завершено');
    }

    const completedQty =
      dto.completedQuantity ?? existingTask.assignedQuantity.toNumber();

    if (completedQty > existingTask.assignedQuantity.toNumber()) {
      throw new BadRequestException(
        `Выполненное количество (${completedQty}) не может превышать назначенное (${existingTask.assignedQuantity.toNumber()})`,
      );
    }

    // Проверяем наличие достаточного количества деталей для выполнения
    await this.checkAvailablePartsForTask(existingTask.packageId, completedQty);

    return await this.prisma.$transaction(async (tx) => {
      // Определяем статус задачи
      const isFullyCompleted =
        completedQty >= existingTask.assignedQuantity.toNumber();
      const newStatus = isFullyCompleted
        ? PackingTaskStatus.COMPLETED
        : PackingTaskStatus.PARTIALLY_COMPLETED;

      // Обновляем статус задачи
      const updatedTask = await tx.packingTask.update({
        where: { taskId },
        data: {
          status: newStatus,
          completedAt: isFullyCompleted ? new Date() : null,
          completedQuantity: completedQty,
          machineId: dto.machineId,
        },
        include: {
          package: {
            include: {
              order: true,
            },
          },
          machine: true,
          assignedUser: {
            include: {
              userDetail: true,
            },
          },
        },
      });

      // Вычитаем количество деталей и поддонов для выполненных упаковок
      await this.deductInventoryForCompletedPackages(
        tx,
        existingTask.packageId,
        completedQty,
      );

      // Обновляем статус упаковки
      await this.updatePackageStatus(existingTask.packageId, tx);

      // Проверяем и обновляем статус заказа
      await this.checkAndUpdateOrderStatus(existingTask.package.orderId, tx);

      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          'room:machines',
          'room:machinesnosmen',
          'room:masterypack',
          'room:machinesypack',
        ],
        'order:event',
        { status: 'updated' },
      );
      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          'room:machines',
          'room:machinesnosmen',
          'room:masterypack',
          'room:machinesypack',
        ],
        'package:event',
        { status: 'updated' },
      );
      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        [
          'room:masterceh',
          'room:machines',
          'room:machinesnosmen',
          'room:masterypack',
          'room:machinesypack',
        ],
        'machine:event',
        { status: 'updated' },
      );
      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        ['room:masterypack', 'room:machinesypack'],
        'machine_task:event',
        { status: 'updated' },
      );

      this.socketService.emitToMultipleRooms(
        ['room:technologist', 'room:director'],
        'order:stats',
        { status: 'updated' },
      );

      return this.mapToResponseDto(updatedTask);
    });
  }

  // Удалить задание у станка
  async deleteTaskFromMachine(taskId: number): Promise<void> {
    const existingTask = await this.prisma.packingTask.findUnique({
      where: { taskId },
    });

    if (!existingTask) {
      throw new NotFoundException(`Задание с ID ${taskId} не найдено`);
    }

    // Можно удалять только задания, которые еще не вы��олнены
    if (existingTask.status === PackingTaskStatus.COMPLETED) {
      throw new BadRequestException('Нельзя удалить выполненное задание');
    }

    await this.prisma.packingTask.delete({
      where: { taskId },
    });

    // Обновляем статус упаковки после удаления задачи
    await this.updatePackageStatus(existingTask.packageId);

    // Отправляем WebSocket уведомления
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:masterypack',
        'room:machinesypack',
      ],
      'package:event',
      { status: 'updated' },
    );
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:masterypack',
        'room:machinesypack',
      ],
      'machine:event',
      { status: 'updated' },
    );
    this.socketService.emitToMultipleRooms(
      ['room:technologist', 'room:director'],
      'order:stats',
      { status: 'updated' },
    );
  }

  // Переместить задание на другой станок
  async moveTaskToMachine(
    taskId: number,
    dto: MoveTaskToMachineDto,
  ): Promise<PackingAssignmentResponseDto> {
    const existingTask = await this.prisma.packingTask.findUnique({
      where: { taskId },
    });

    if (!existingTask) {
      throw new NotFoundException(`Задание с ID ${taskId} не найдено`);
    }

    // Проверяем существование нового станка
    const machine = await this.prisma.machine.findUnique({
      where: { machineId: dto.machineId },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${dto.machineId} не найден`);
    }

    // Проверяем существование пользователя, если указан
    if (dto.assignedTo) {
      const user = await this.prisma.user.findUnique({
        where: { userId: dto.assignedTo },
      });

      if (!user) {
        throw new NotFoundException(
          `Пользователь с ID ${dto.assignedTo} не найден`,
        );
      }
    }

    // Нельзя перемещать завершенные задания
    if (existingTask.status === PackingTaskStatus.COMPLETED) {
      throw new BadRequestException('Нельзя переместить завершенное задание');
    }

    const updatedTask = await this.prisma.packingTask.update({
      where: { taskId },
      data: {
        machineId: dto.machineId,
        assignedTo: dto.assignedTo ?? existingTask.assignedTo,
        status: PackingTaskStatus.PENDING, // Сбрасываем статус на PENDING при перемещении
        assignedAt: new Date(), // Обновляем время назначения
        completedAt: null, // Сбрасываем время за��ершения
      },
      include: {
        package: {
          include: {
            order: true,
          },
        },
        machine: true,
        assignedUser: {
          include: {
            userDetail: true,
          },
        },
      },
    });

    // Обновляем статус упаковки
    await this.updatePackageStatus(existingTask.packageId);

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:masterypack',
        'room:machinesypack',
      ],
      'package:event',
      { status: 'updated' },
    );
    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:masterypack',
        'room:machinesypack',
      ],
      'machine:event',
      { status: 'updated' },
    );

    return this.mapToResponseDto(updatedTask);
  }

  // Обновить статус задания
  async updateTaskStatus(
    taskId: number,
    dto: UpdateTaskStatusDto,
  ): Promise<PackingAssignmentResponseDto> {
    const existingTask = await this.prisma.packingTask.findUnique({
      where: { taskId },
      include: {
        package: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!existingTask) {
      throw new NotFoundException(`Задание с ID ${taskId} не найдено`);
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      status: dto.status,
    };

    // Обрабатываем completedQuantity если передано
    if (dto.completedQuantity !== undefined) {
      if (dto.completedQuantity > existingTask.assignedQuantity.toNumber()) {
        throw new BadRequestException(
          `Выполненное количество (${dto.completedQuantity}) не может превышать назначенное (${existingTask.assignedQuantity.toNumber()})`,
        );
      }
      updateData.completedQuantity = dto.completedQuantity;
    }

    // Если статус меняется на IN_PROGRESS, проверяем наличие деталей
    if (
      dto.status === PackingTaskStatus.IN_PROGRESS &&
      existingTask.status !== PackingTaskStatus.IN_PROGRESS
    ) {
      await this.checkAvailablePartsForTask(
        existingTask.packageId,
        existingTask.assignedQuantity.toNumber(),
      );
    }

    // Если статус меняется на COMPLETED, устанавливаем время завершения и вычитаем запасы
    if (
      dto.status === PackingTaskStatus.COMPLETED &&
      existingTask.status !== PackingTaskStatus.COMPLETED
    ) {
      updateData.completedAt = new Date();
      // Если не указано completedQuantity, считаем что выполнено полностью
      if (dto.completedQuantity === undefined) {
        updateData.completedQuantity = existingTask.assignedQuantity.toNumber();
      }

      // Проверяем наличие достаточного количества деталей для выполнения
      const completedQty =
        dto.completedQuantity ?? existingTask.assignedQuantity.toNumber();
      await this.checkAvailablePartsForTask(
        existingTask.packageId,
        completedQty,
      );
    }

    // Если статус меняется с COMPLETED на другой, сбрасываем время завершения
    if (
      dto.status !== PackingTaskStatus.COMPLETED &&
      existingTask.status === PackingTaskStatus.COMPLETED
    ) {
      updateData.completedAt = null;
    }

    return await this.prisma
      .$transaction(async (tx) => {
        const updatedTask = await tx.packingTask.update({
          where: { taskId },
          data: updateData,
          include: {
            package: {
              include: {
                order: true,
              },
            },
            machine: true,
            assignedUser: {
              include: {
                userDetail: true,
              },
            },
          },
        });

        // Если статус изменился на COMPLETED, вычитаем запасы
        if (
          dto.status === PackingTaskStatus.COMPLETED &&
          existingTask.status !== PackingTaskStatus.COMPLETED
        ) {
          const completedQty =
            dto.completedQuantity ?? existingTask.assignedQuantity.toNumber();
          await this.deductInventoryForCompletedPackages(
            tx,
            existingTask.packageId,
            completedQty,
          );
        }

        // Обновляем статус упаковки
        await this.updatePackageStatus(existingTask.packageId, tx);

        // Проверяем и обновляем статус заказа
        await this.checkAndUpdateOrderStatus(existingTask.package.orderId, tx);

        return updatedTask;
      })
      .then((updatedTask) => {
        // Отправляем WebSocket уведомление о событии
        this.socketService.emitToMultipleRooms(
          [
            'room:masterceh',
            'room:machines',
            'room:machinesnosmen',
            'room:masterypack',
            'room:machinesypack',
          ],
          'package:event',
          { status: 'updated' },
        );
        this.socketService.emitToMultipleRooms(
          ['room:technologist', 'room:director'],
          'order:stats',
          { status: 'updated' },
        );

        return this.mapToResponseDto(updatedTask);
      });
  }

  // Назначить пользователя на задание
  async assignUserToTask(
    taskId: number,
    dto: AssignUserToTaskDto,
  ): Promise<PackingAssignmentResponseDto> {
    const existingTask = await this.prisma.packingTask.findUnique({
      where: { taskId },
    });

    if (!existingTask) {
      throw new NotFoundException(`Задание с ID ${taskId} не найдено`);
    }

    // Проверяем существование пользователя, если указан
    if (dto.assignedTo) {
      const user = await this.prisma.user.findUnique({
        where: { userId: dto.assignedTo },
      });

      if (!user) {
        throw new NotFoundException(
          `Пользователь с ID ${dto.assignedTo} не найден`,
        );
      }
    }

    const updatedTask = await this.prisma.packingTask.update({
      where: { taskId },
      data: {
        assignedTo: dto.assignedTo,
      },
      include: {
        package: {
          include: {
            order: true,
          },
        },
        machine: true,
        assignedUser: {
          include: {
            userDetail: true,
          },
        },
      },
    });

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
      'package:event',
      { status: 'updated' },
    );

    return this.mapToResponseDto(updatedTask);
  }

  // Получить задания по пользователю
  async getTasksByUser(
    userId: number,
  ): Promise<PackingAssignmentResponseDto[]> {
    // Проверяем существование пользователя
    const user = await this.prisma.user.findUnique({
      where: { userId },
    });

    if (!user) {
      throw new NotFoundException(`Пользователь с ID ${userId} не найден`);
    }

    const tasks = await this.prisma.packingTask.findMany({
      where: { assignedTo: userId },
      orderBy: [{ priority: 'desc' }, { assignedAt: 'asc' }],
      include: {
        package: {
          include: {
            order: true,
          },
        },
        machine: true,
        assignedUser: {
          include: {
            userDetail: true,
          },
        },
      },
    });

    return tasks.map((task) => this.mapToResponseDto(task));
  }

  // Назначить приоритет заданию
  async setTaskPriority(
    taskId: number,
    dto: SetTaskPriorityDto,
  ): Promise<PackingAssignmentResponseDto> {
    const existingTask = await this.prisma.packingTask.findUnique({
      where: { taskId },
    });

    if (!existingTask) {
      throw new NotFoundException(`Задание с ID ${taskId} не найдено`);
    }

    const updatedTask = await this.prisma.packingTask.update({
      where: { taskId },
      data: {
        priority: dto.priority,
      },
      include: {
        package: {
          include: {
            order: true,
          },
        },
        machine: true,
        assignedUser: {
          include: {
            userDetail: true,
          },
        },
      },
    });

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
      'package:event',
      { status: 'updated' },
    );

    return this.mapToResponseDto(updatedTask);
  }

  // Проверка наличия достаточного количества деталей на назначенных поддонах
  private async checkAvailablePartsForTask(
    packageId: number,
    packagesCount: number,
    tx?: any,
  ): Promise<void> {
    const prisma = tx || this.prisma;
    const packageData = await prisma.package.findUnique({
      where: { packageId },
      include: {
        composition: true,
        palletAssignments: {
          where: {
            pallet: {
              isActive: true,
            },
          },
          include: {
            pallet: {
              include: {
                part: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'asc',
          },
        },
      },
    });

    if (!packageData) {
      throw new NotFoundException(`Упаковка с ID ${packageId} не найдена`);
    }

    // Если нет состава упаковки, не можем проверить
    if (packageData.composition.length === 0) {
      throw new BadRequestException(
        'У упаковки отсутствует состав деталей. Невозможно определить требования.',
      );
    }

    // Если нет назначенных поддонов, блокируем взятие в работу
    if (packageData.palletAssignments.length === 0) {
      throw new BadRequestException(
        'Нет назначенных поддонов для данной упаковки. Необходимо сначала разместить детали на упаковку.',
      );
    }

    // Группируем назначенные поддоны по деталям
    const assignedPalletsByPart = new Map<string, any[]>();
    for (const assignment of packageData.palletAssignments) {
      const partCode = assignment.pallet.part.partCode;
      if (!assignedPalletsByPart.has(partCode)) {
        assignedPalletsByPart.set(partCode, []);
      }
      assignedPalletsByPart.get(partCode)!.push(assignment);
    }

    // Проверяем каждую деталь из состава упаковки
    for (const composition of packageData.composition) {
      const requiredQuantity =
        composition.quantityPerPackage.toNumber() * packagesCount;
      const assignments = assignedPalletsByPart.get(composition.partCode) || [];

      // Если для детали нет назначенных поддонов
      if (assignments.length === 0) {
        throw new BadRequestException(
          `Деталь "${composition.partName}" (код: ${composition.partCode}) не размещена на поддонах для упаковки. Требуется: ${requiredQuantity} шт.`,
        );
      }

      const availableQuantity = assignments.reduce(
        (sum, assignment) =>
          sum +
          (assignment.quantity.toNumber() - assignment.usedQuantity.toNumber()),
        0,
      );

      if (availableQuantity < requiredQuantity) {
        throw new BadRequestException(
          `Недостаточно деталей "${composition.partName}" на назначенных поддонах. Требуется: ${requiredQuantity}, размещено: ${availableQuantity}`,
        );
      }
    }
  }

  // Отметка использованных деталей для выполненных упаковок
  private async deductInventoryForCompletedPackages(
    tx: any,
    packageId: number,
    completedPackagesCount: number, // Количество упаковок
  ): Promise<void> {
    const packageData = await tx.package.findUnique({
      where: { packageId },
      include: {
        composition: true,
        palletAssignments: {
          include: {
            pallet: {
              include: {
                part: true,
              },
            },
          },
          orderBy: {
            assignedAt: 'asc',
          },
        },
      },
    });

    if (!packageData) return;

    // Группируем назначения по деталям
    const assignmentsByPart = new Map<string, any[]>();
    for (const assignment of packageData.palletAssignments) {
      const partCode = assignment.pallet.part.partCode;
      if (!assignmentsByPart.has(partCode)) {
        assignmentsByPart.set(partCode, []);
      }
      assignmentsByPart.get(partCode)!.push(assignment);
    }

    // Отмечаем использованное количество для каждой детали
    for (const composition of packageData.composition) {
      let remainingToMark =
        composition.quantityPerPackage.toNumber() * completedPackagesCount;
      const assignments = assignmentsByPart.get(composition.partCode) || [];

      for (const assignment of assignments) {
        if (remainingToMark <= 0) break;

        const availableQuantity =
          assignment.quantity.toNumber() - assignment.usedQuantity.toNumber();
        const markFromThisAssignment = Math.min(
          remainingToMark,
          availableQuantity,
        );

        if (markFromThisAssignment > 0) {
          const newUsedQuantity =
            assignment.usedQuantity.toNumber() + markFromThisAssignment;
          const newQuantity =
            assignment.quantity.toNumber() - markFromThisAssignment;

          // Обновляем использованное количество и уменьшаем общее количество
          await tx.palletPackageAssignment.update({
            where: { assignmentId: assignment.assignmentId },
            data: {
              usedQuantity: newUsedQuantity,
              quantity: newQuantity,
            },
          });

          // Проверяем, не исчерпался ли поддон полностью
          const updatedPallet = await tx.pallet.findUnique({
            where: { palletId: assignment.palletId },
            include: {
              packageAssignments: {
                select: {
                  quantity: true,
                },
              },
            },
          });

          if (updatedPallet) {
            const totalAssigned = updatedPallet.packageAssignments.reduce(
              (sum, pa) => sum + pa.quantity.toNumber(),
              0,
            );
            const availableOnPallet =
              updatedPallet.quantity.toNumber() - totalAssigned;

            // Если на поддоне не осталось деталей, деактивируем его
            if (availableOnPallet <= 0) {
              await tx.pallet.update({
                where: { palletId: assignment.palletId },
                data: {
                  isActive: false,
                },
              });

              // Удаляем поддон из ячейки буфера, если он там находится
              const currentCell = await tx.palletBufferCell.findFirst({
                where: {
                  palletId: assignment.palletId,
                  removedAt: null,
                },
              });

              if (currentCell) {
                await tx.palletBufferCell.update({
                  where: { palletCellId: currentCell.palletCellId },
                  data: { removedAt: new Date() },
                });

                // Обновляем загрузку ячейки
                await tx.bufferCell.update({
                  where: { cellId: currentCell.cellId },
                  data: {
                    currentLoad: {
                      decrement: updatedPallet.quantity,
                    },
                    status: 'AVAILABLE',
                  },
                });
              }
            }
          }

          remainingToMark -= markFromThisAssignment;
        }
      }
    }
  }

  // Проверка и обновление статуса заказа
  private async checkAndUpdateOrderStatus(
    orderId: number,
    tx: any,
  ): Promise<void> {
    const order = await tx.order.findUnique({
      where: { orderId },
      include: {
        packages: true,
      },
    });

    if (!order) return;

    // Проверяем, все ли упаковки завершены по их статусу
    const allPackagesCompleted = order.packages.every(
      (pkg) => pkg.packingStatus === PackageStatus.COMPLETED,
    );

    if (allPackagesCompleted && !order.isCompleted) {
      await tx.order.update({
        where: { orderId },
        data: {
          isCompleted: true,
          completedAt: new Date(),
          status: 'COMPLETED',
          completionPercentage: 100,
        },
      });
    }
  }

  // Метод для обновления статуса упаковки на основе статусов задач
  private async updatePackageStatus(
    packageId: number,
    tx?: any,
  ): Promise<void> {
    const prisma = tx || this.prisma;

    const packageData = await prisma.package.findUnique({
      where: { packageId },
      include: {
        packingTasks: true,
      },
    });

    if (!packageData) return;

    let newStatus: PackageStatus = PackageStatus.NOT_PROCESSED;
    const tasks = packageData.packingTasks;

    if (tasks.length === 0) {
      newStatus = PackageStatus.NOT_PROCESSED;
    } else {
      // Подсчитываем общее количество и выполненное
      const totalAssigned = tasks.reduce(
        (sum, task) => sum + task.assignedQuantity.toNumber(),
        0,
      );
      const totalCompleted = tasks.reduce(
        (sum, task) => sum + task.completedQuantity.toNumber(),
        0,
      );
      const packageQuantity = packageData.quantity.toNumber();

      // Проверяем, выполнена ли вся упаковка
      if (totalCompleted >= packageQuantity) {
        newStatus = PackageStatus.COMPLETED;
      } else if (totalCompleted > 0) {
        newStatus = PackageStatus.IN_PROGRESS;
      } else if (
        tasks.some((task) => task.status === PackingTaskStatus.IN_PROGRESS)
      ) {
        newStatus = PackageStatus.IN_PROGRESS;
      } else if (
        tasks.some((task) => task.status === PackingTaskStatus.PENDING)
      ) {
        newStatus = PackageStatus.PENDING;
      }
    }

    // Если упаковка завершена, освобождаем неиспользованные детали
    if (newStatus === PackageStatus.COMPLETED) {
      await this.releaseUnusedPallets(packageId, prisma);
    }

    await prisma.package.update({
      where: { packageId },
      data: {
        packingStatus: newStatus,
        packingCompletedAt:
          newStatus === PackageStatus.COMPLETED ? new Date() : null,
      },
    });
  }

  // Освобождение неиспользованных поддонов при завершении упаковки
  private async releaseUnusedPallets(
    packageId: number,
    tx: any,
  ): Promise<void> {
    // Получаем все назначения поддонов для данной упаковки
    const assignments = await tx.palletPackageAssignment.findMany({
      where: { packageId },
      include: {
        pallet: {
          include: {
            part: true,
          },
        },
      },
    });

    for (const assignment of assignments) {
      // Если есть неиспользованное количество (quantity > 0)
      if (assignment.quantity.toNumber() > 0) {
        // Возвращаем неиспользованное количество обратно на поддон
        await tx.pallet.update({
          where: { palletId: assignment.palletId },
          data: {
            quantity: {
              increment: assignment.quantity,
            },
          },
        });

        // Обновляем назначение - обнуляем неиспользованное количество
        await tx.palletPackageAssignment.update({
          where: { assignmentId: assignment.assignmentId },
          data: {
            quantity: 0,
          },
        });

        // Если поддон не находится в ячейке, возвращаем его в буфер
        const currentCell = await tx.palletBufferCell.findFirst({
          where: {
            palletId: assignment.palletId,
            removedAt: null,
          },
        });

        if (!currentCell) {
          // Находим подходящий буфер для возврата поддона
          const availableCell = await tx.bufferCell.findFirst({
            where: {
              status: 'AVAILABLE',
              currentLoad: {
                lt: tx.bufferCell.fields.capacity,
              },
            },
            orderBy: {
              currentLoad: 'asc',
            },
          });

          if (availableCell) {
            // Размещаем поддон в ячейке
            await tx.palletBufferCell.create({
              data: {
                palletId: assignment.palletId,
                cellId: availableCell.cellId,
                placedAt: new Date(),
              },
            });

            // Обновляем загрузку ячейки
            await tx.bufferCell.update({
              where: { cellId: availableCell.cellId },
              data: {
                currentLoad: {
                  increment: assignment.pallet.quantity,
                },
                status: 'OCCUPIED',
              },
            });

            // Обновляем статус детали обратно на COMPLETED
            await tx.part.update({
              where: { partId: assignment.pallet.partId },
              data: {
                status: 'COMPLETED',
              },
            });
          }
        }
      }
    }
  }

  // Вспомогательный метод для преобразования данных в DTO ответа
  private mapToResponseDto(task: any): PackingAssignmentResponseDto {
    // Теперь производственная упаковка напрямую связана с задачей упаковки
    const productionPackageInfo: ProductionPackageInfo = {
      packageId: task.package.packageId,
      packageCode: task.package.packageCode,
      packageName: task.package.packageName,
      completionPercentage: task.package.completionPercentage.toNumber(),
      quantity: task.package.quantity.toNumber(),
      order: {
        orderId: task.package.order.orderId,
        batchNumber: task.package.order.batchNumber,
        orderName: task.package.order.orderName,
        completionPercentage:
          task.package.order.completionPercentage.toNumber(),
        isCompleted: task.package.order.isCompleted,
        launchPermission: task.package.order.launchPermission,
      },
    };

    return {
      taskId: task.taskId,
      packageId: task.packageId,
      machineId: task.machineId,
      assignedTo: task.assignedTo,
      status: task.status,
      priority: task.priority.toNumber(),
      assignedAt: task.assignedAt,
      completedAt: task.completedAt,
      assignedQuantity: task.assignedQuantity?.toNumber() || 0,
      completedQuantity: task.completedQuantity?.toNumber() || 0,
      package: {
        packageId: task.package.packageId,
        packageName: task.package.packageName,
        status: task.package.packingStatus, // Используем новое поле packingStatus
      },
      machine: {
        machineId: task.machine.machineId,
        machineName: task.machine.machineName,
        status: task.machine.status,
      },
      assignedUser: task.assignedUser
        ? {
            userId: task.assignedUser.userId,
            login: task.assignedUser.login,
            firstName: task.assignedUser.userDetail?.firstName,
            lastName: task.assignedUser.userDetail?.lastName,
          }
        : undefined,
      productionPackage: productionPackageInfo,
    };
  }
}
