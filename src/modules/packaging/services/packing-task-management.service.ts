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

    const updatedTask = await this.prisma.packingTask.update({
      where: { taskId },
      data: {
        status: PackingTaskStatus.IN_PROGRESS,
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
      ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
      'package:event',
      { status: 'updated' },
    );

    return this.mapToResponseDto(updatedTask);
  }

  // Отметить задание как выполнено
  async markTaskAsCompleted(
    taskId: number,
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

    return await this.prisma.$transaction(async (tx) => {
      // Обновляем статус задачи
      const updatedTask = await tx.packingTask.update({
        where: { taskId },
        data: {
          status: PackingTaskStatus.COMPLETED,
          completedAt: new Date(),
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

      // Вычитаем количество деталей и поддонов для закрытой упаковки
      await this.deductInventoryForPackage(tx, existingTask.packageId);

      // Обновляем статус упаковки
      await this.updatePackageStatus(existingTask.packageId, tx);

      // Проверяем и обновляем статус заказа
      await this.checkAndUpdateOrderStatus(existingTask.package.orderId, tx);

      // Отправляем WebSocket уведомление о событии
      this.socketService.emitToMultipleRooms(
        ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
        'package:event',
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

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
      'package:event',
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
      ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
      'package:event',
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
    });

    if (!existingTask) {
      throw new NotFoundException(`Задание с ID ${taskId} не найдено`);
    }

    // Подготавливаем данные для обновления
    const updateData: any = {
      status: dto.status,
    };

    // Если статус меняется на COMPLETED, устанавливаем время завершения
    if (
      dto.status === PackingTaskStatus.COMPLETED &&
      existingTask.status !== PackingTaskStatus.COMPLETED
    ) {
      updateData.completedAt = new Date();
    }

    // Если статус меняется с COMPLETED на другой, сбрасываем время завершения
    if (
      dto.status !== PackingTaskStatus.COMPLETED &&
      existingTask.status === PackingTaskStatus.COMPLETED
    ) {
      updateData.completedAt = null;
    }

    const updatedTask = await this.prisma.packingTask.update({
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

    // Обновляем статус упаковки
    await this.updatePackageStatus(existingTask.packageId);

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      ['room:masterceh', 'room:machines', 'room:machinesnosmen'],
      'package:event',
      { status: 'updated' },
    );

    return this.mapToResponseDto(updatedTask);
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

  // Вычитание запасов для завершенной упаковки
  private async deductInventoryForPackage(
    tx: any,
    packageId: number,
  ): Promise<void> {
    const packageData = await tx.package.findUnique({
      where: { packageId },
      include: {
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
    });

    if (!packageData) return;

    // Вычитаем количество деталей из поддонов
    for (const assignment of packageData.palletAssignments) {
      const newQuantity = assignment.pallet.quantity - assignment.quantity;

      await tx.pallet.update({
        where: { palletId: assignment.palletId },
        data: { quantity: newQuantity },
      });

      // Создаем запись о движении запасов
      await tx.inventoryMovement.create({
        data: {
          partId: assignment.pallet.partId,
          palletId: assignment.palletId,
          deltaQuantity: -assignment.quantity,
          reason: `Упаковка завершена: Package ${packageId}`,
        },
      });
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
        packages: {
          include: {
            packingTasks: true,
          },
        },
      },
    });

    if (!order) return;

    // Проверяем, все ли упаковки завершены
    const allPackagesCompleted = order.packages.every((pkg) =>
      pkg.packingTasks.every(
        (task) => task.status === PackingTaskStatus.COMPLETED,
      ),
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
    } else if (
      tasks.every((task) => task.status === PackingTaskStatus.COMPLETED)
    ) {
      newStatus = PackageStatus.COMPLETED;
    } else if (
      tasks.some((task) => task.status === PackingTaskStatus.IN_PROGRESS)
    ) {
      newStatus = PackageStatus.IN_PROGRESS;
    } else if (
      tasks.some((task) => task.status === PackingTaskStatus.PENDING)
    ) {
      newStatus = PackageStatus.PENDING;
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
