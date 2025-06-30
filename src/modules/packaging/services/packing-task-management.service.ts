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

@Injectable()
export class PackingTaskManagementService {
  constructor(private readonly prisma: PrismaService) {}

  // Отметить задание как взято в работу
  async markTaskAsInProgress(taskId: number): Promise<PackingAssignmentResponseDto> {
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

    return this.mapToResponseDto(updatedTask);
  }

  // Отметить задание как выполнено
  async markTaskAsCompleted(taskId: number): Promise<PackingAssignmentResponseDto> {
    const existingTask = await this.prisma.packingTask.findUnique({
      where: { taskId },
    });

    if (!existingTask) {
      throw new NotFoundException(`Задание с ID ${taskId} не найдено`);
    }

    // Проверяем, что задание можно завершить
    if (existingTask.status === PackingTaskStatus.COMPLETED) {
      throw new BadRequestException('Задание уже завершено');
    }

    const updatedTask = await this.prisma.packingTask.update({
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

    // Обновляем статус упаковки
    await this.updatePackageStatus(existingTask.packageId);

    return this.mapToResponseDto(updatedTask);
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

    return this.mapToResponseDto(updatedTask);
  }

  // Получить задания по пользователю
  async getTasksByUser(userId: number): Promise<PackingAssignmentResponseDto[]> {
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

  // Метод для обновления статуса упаковки на основе статусов задач
  private async updatePackageStatus(packageId: number): Promise<void> {
    // Получаем все задачи упаковки для данной упаковки
    const tasks = await this.prisma.packingTask.findMany({
      where: { packageId },
    });

    let newPackageStatus: PackageStatus;
    let packingAssignedAt: Date | null = null;
    let packingCompletedAt: Date | null = null;

    if (tasks.length === 0) {
      // Если нет задач, статус NOT_PROCESSED
      newPackageStatus = PackageStatus.NOT_PROCESSED;
    } else {
      const hasCompleted = tasks.some(task => task.status === PackingTaskStatus.COMPLETED);
      const hasInProgress = tasks.some(task => task.status === PackingTaskStatus.IN_PROGRESS);
      const hasPending = tasks.some(task => task.status === PackingTaskStatus.PENDING);
      const allCompleted = tasks.every(task => task.status === PackingTaskStatus.COMPLETED);

      if (allCompleted) {
        newPackageStatus = PackageStatus.COMPLETED;
        // Находим максимальную дату завершения
        const completedTasks = tasks.filter(task => task.completedAt);
        if (completedTasks.length > 0) {
          packingCompletedAt = new Date(Math.max(...completedTasks.map(task => task.completedAt!.getTime())));
        }
      } else if (hasInProgress) {
        newPackageStatus = PackageStatus.IN_PROGRESS;
      } else if (hasPending) {
        newPackageStatus = PackageStatus.PENDING;
        // Находим минимальную дату назначения
        const assignedTasks = tasks.filter(task => task.assignedAt);
        if (assignedTasks.length > 0) {
          packingAssignedAt = new Date(Math.min(...assignedTasks.map(task => task.assignedAt.getTime())));
        }
      } else {
        newPackageStatus = PackageStatus.NOT_PROCESSED;
      }
    }

    // Обновляем статус упаковки
    await this.prisma.package.update({
      where: { packageId },
      data: {
        packingStatus: newPackageStatus,
        packingAssignedAt,
        packingCompletedAt,
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
        completionPercentage: task.package.order.completionPercentage.toNumber(),
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