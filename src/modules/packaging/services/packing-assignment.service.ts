import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  CreatePackingAssignmentDto,
  UpdatePackingAssignmentDto,
  PackingAssignmentQueryDto,
} from '../dto/packing-assignment.dto';
import {
  PackingAssignmentResponseDto,
  PackingAssignmentListResponseDto,
  ProductionPackageInfo,
  OrderInfo,
} from '../dto/packing-assignment-response.dto';
import { PackingTaskStatus, PackageStatus } from '@prisma/client';
import { SocketService } from '../../websocket/services/socket.service';

@Injectable()
export class PackingAssignmentService {
  private readonly logger = new Logger(PackingAssignmentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private socketService: SocketService,
  ) { }

  /**
   * Получить все станки упаковки по ID участка с дополнительной информацией
   * @param stageId ID производственного участка (этапа 1-го уровня)
   * @returns Массив объектов с информацией о станках упаковки
   */
  async getPackingMachinesByStageId(stageId?: number) {
    this.logger.log(`Получение станков упаковки для участка с ID: ${stageId}`);

    try {
      // Если указан stageId, проверяем существование участка
      if (stageId) {
        const stage = await this.prisma.productionStageLevel1.findUnique({
          where: { stageId, finalStage: true },
        });

        if (!stage) {
          throw new NotFoundException(
            `Финальный участок с ID ${stageId} не найден`,
          );
        }
      }

      // Получаем все станки упаковки
      const machines = await this.prisma.machine.findMany({
        where: {
          noSmenTask: false,
          ...(stageId && {
            machinesStages: {
              some: {
                stageId,
                stage: { finalStage: true },
              },
            },
          }),
        },
        include: {
          packingTasks: {
            where: {
              status: { in: ['PENDING', 'IN_PROGRESS'] },
            },
            include: {
              package: true,
            },
          },
        },
      });

      // Получаем завершенные задачи упаковки
      const completedTasks = await this.prisma.packingTask.findMany({
        where: {
          status: 'COMPLETED',
          machine: {
            ...(stageId && {
              machinesStages: {
                some: {
                  stageId,
                  stage: { finalStage: true },
                },
              },
            }),
          },
        },
        include: {
          machine: true,
          package: true,
        },
      });

      // Группируем завершенные задачи по станкам
      const completedByMachine = completedTasks.reduce((acc, task) => {
        const machineId = task.machine.machineId;
        if (!acc[machineId]) acc[machineId] = 0;
        acc[machineId] += task.package.quantity.toNumber();
        return acc;
      }, {});

      // Формируем ответ
      const result = machines.map((machine) => {
        const plannedQuantity = machine.packingTasks.reduce(
          (total, task) => total + task.package.quantity.toNumber(),
          0,
        );

        const completedQuantity = completedByMachine[machine.machineId] || 0;

        return {
          id: machine.machineId,
          name: machine.machineName,
          status: machine.status,
          load_unit: machine.loadUnit,
          recommendedLoad: machine.recommendedLoad.toNumber(),
          plannedQuantity,
          completedQuantity,
        };
      });

      this.logger.log(`Успешно получено ${result.length} станков упаковки`);
      return result;
    } catch (error) {
      this.logger.error(
        `Ошибка при получении станков упаковки: ${(error as Error).message}`,
      );
      throw error;
    }
  }

  // Создание нового назначения задания на станок упаковки или обновление существующего
  async createAssignment(
    dto: CreatePackingAssignmentDto,
  ): Promise<PackingAssignmentResponseDto> {
    // Проверяем существование производственной упаковки
    const productionPackage = await this.prisma.package.findUnique({
      where: { packageId: dto.packageId },
    });

    if (!productionPackage) {
      throw new NotFoundException(
        `Производственная упаковка с ID ${dto.packageId} не найдена`,
      );
    }

    // Проверяем существование станка
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

    // Проверяем готовность упаковки к назначению
    const readyForPackaging = await this.checkPackageReadiness(dto.packageId);
    if (readyForPackaging < productionPackage.quantity.toNumber()) {
      throw new BadRequestException(
        `Упаковка не готова к назначению. Готово: ${readyForPackaging}, требуется: ${productionPackage.quantity.toNumber()}`,
      );
    }

    // Ищем существующее задание для этого пакета (независимо от станка)
    const existingTask = await this.prisma.packingTask.findFirst({
      where: {
        packageId: dto.packageId,
        status: {
          in: [
            PackingTaskStatus.NOT_PROCESSED,
            PackingTaskStatus.PENDING,
            PackingTaskStatus.IN_PROGRESS,
            PackingTaskStatus.PARTIALLY_COMPLETED,
          ],
        },
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

    if (existingTask) {
      // Если задание существует, обновляем его
      const updatedTask = await this.prisma.packingTask.update({
        where: { taskId: existingTask.taskId },
        data: {
          machineId: dto.machineId, // Обновляем станок
          assignedTo: dto.assignedTo, // Обновляем назначенного пользователя
          priority: dto.priority ?? existingTask.priority.toNumber(), // Обновляем приоритет или оставляем старый
          status: PackingTaskStatus.PENDING, // Сбрасываем статус на PENDING
          assignedAt: new Date(), // Обновляем время назначения
          completedAt: null, // Сбрасываем время завершения
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
      await this.updatePackageStatus(dto.packageId);

      return this.mapToResponseDto(updatedTask);
    } else {
      // Если задания нет, создаем новое
      const newTask = await this.prisma.packingTask.create({
        data: {
          packageId: dto.packageId,
          machineId: dto.machineId,
          assignedTo: dto.assignedTo,
          status: PackingTaskStatus.PENDING,
          priority: dto.priority ?? 0,
          assignedAt: new Date(),
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
      await this.updatePackageStatus(dto.packageId);

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

      return this.mapToResponseDto(newTask);
    }
  }

  // Получение списка заданий с фильтрами
  async getAssignments(
    query: PackingAssignmentQueryDto,
  ): Promise<PackingAssignmentListResponseDto> {
    const { machineId, assignedTo, status, page = 1, limit = 10 } = query;

    // Строим условие WHERE
    let whereClause: any = {};

    if (machineId) {
      whereClause.machineId = machineId;
    }

    if (assignedTo) {
      whereClause.assignedTo = assignedTo;
    }

    if (status) {
      whereClause.status = status;
    }

    // Получаем задания с пагинацией
    const tasks = await this.prisma.packingTask.findMany({
      where: whereClause,
      orderBy: [
        { priority: 'desc' }, // Сначала по приоритету (высокий приоритет первым)
        { assignedAt: 'asc' }, // Затем по времени назначения
      ],
      skip: (page - 1) * limit,
      take: limit,
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

    // Получаем общее количество для пагинации
    const total = await this.prisma.packingTask.count({
      where: whereClause,
    });

    const assignments = tasks.map((task) => this.mapToResponseDto(task));

    return {
      assignments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Получение задания по ID
  async getAssignmentById(
    taskId: number,
  ): Promise<PackingAssignmentResponseDto> {
    const task = await this.prisma.packingTask.findUnique({
      where: { taskId },
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

    if (!task) {
      throw new NotFoundException(`Задание с ID ${taskId} не найдено`);
    }

    return this.mapToResponseDto(task);
  }

  // Получение заданий по станку
  async getAssignmentsByMachine(
    machineId: number,
  ): Promise<PackingAssignmentResponseDto[]> {
    // Проверяем существование станка
    const machine = await this.prisma.machine.findUnique({
      where: { machineId },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    const tasks = await this.prisma.packingTask.findMany({
      where: {
        machineId,
        status: {
          not: 'COMPLETED', // исключаем завершённые
        },
      },
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
      const hasCompleted = tasks.some(
        (task) => task.status === PackingTaskStatus.COMPLETED,
      );
      const hasInProgress = tasks.some(
        (task) => task.status === PackingTaskStatus.IN_PROGRESS,
      );
      const hasPending = tasks.some(
        (task) => task.status === PackingTaskStatus.PENDING,
      );
      const allCompleted = tasks.every(
        (task) => task.status === PackingTaskStatus.COMPLETED,
      );

      if (allCompleted) {
        newPackageStatus = PackageStatus.COMPLETED;
        // Находим максимальную дату завершения
        const completedTasks = tasks.filter((task) => task.completedAt);
        if (completedTasks.length > 0) {
          packingCompletedAt = new Date(
            Math.max(
              ...completedTasks.map((task) => task.completedAt!.getTime()),
            ),
          );
        }
      } else if (hasInProgress) {
        newPackageStatus = PackageStatus.IN_PROGRESS;
      } else if (hasPending) {
        newPackageStatus = PackageStatus.PENDING;
        // Находим минимальную дату назначения
        const assignedTasks = tasks.filter((task) => task.assignedAt);
        if (assignedTasks.length > 0) {
          packingAssignedAt = new Date(
            Math.min(...assignedTasks.map((task) => task.assignedAt.getTime())),
          );
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

  // Проверка готовности упаковки к назначению
  private async checkPackageReadiness(packageId: number): Promise<number> {
    const packageData = await this.prisma.package.findUnique({
      where: { packageId },
      select: {
        quantity: true,
        productionPackageParts: {
          select: {
            quantity: true,
            part: {
              select: {
                partCode: true,
              },
            },
          },
        },
      },
    });

    if (!packageData) return 0;

    const totalPackages = packageData.quantity.toNumber();
    
    // Получаем состав упаковки
    const composition = await this.prisma.packageComposition.findMany({
      where: { packageId },
      include: {
        route: {
          include: {
            routeStages: {
              include: {
                stage: true,
              },
              orderBy: { sequenceNumber: 'asc' },
            },
          },
        },
      },
    });

    let minReadyPackages = Infinity;

    for (const comp of composition) {
      const totalRequired = comp.quantity.toNumber();
      const requiredPerPackage = totalRequired / totalPackages;
      const route = comp.route;

      // Находим финальный этап маршрута (не упаковочный)
      const nonFinalStages = route.routeStages.filter(
        (rs) => !rs.stage.finalStage,
      );
      const lastNonFinalStage = nonFinalStages[nonFinalStages.length - 1];

      if (!lastNonFinalStage) continue;

      // Получаем поддоны, которые завершили все этапы маршрута
      const completedPallets = await this.prisma.pallet.findMany({
        where: {
          part: {
            partCode: comp.partCode,
          },
          palletStageProgress: {
            some: {
              routeStageId: lastNonFinalStage.routeStageId,
              status: 'COMPLETED',
            },
          },
        },
        select: {
          quantity: true,
        },
      });

      const totalCompletedQuantity = completedPallets.reduce(
        (sum, pallet) => sum + pallet.quantity.toNumber(),
        0,
      );

      const possiblePackages = Math.floor(
        totalCompletedQuantity / requiredPerPackage,
      );
      minReadyPackages = Math.min(minReadyPackages, possiblePackages);
    }

    const baseReadyForPackaging =
      minReadyPackages === Infinity
        ? 0
        : Math.min(minReadyPackages, totalPackages);

    // Получаем статистику распределенных упаковок
    const distributed = await this.getDistributedPackages(packageId);

    return Math.max(0, baseReadyForPackaging - distributed);
  }

  // Получение количества распределенных упаковок
  private async getDistributedPackages(packageId: number): Promise<number> {
    const packingTasks = await this.prisma.packingTask.findMany({
      where: {
        packageId,
        status: {
          in: ['PENDING', 'IN_PROGRESS', 'COMPLETED', 'PARTIALLY_COMPLETED'],
        },
      },
    });

    const packageData = await this.prisma.package.findUnique({
      where: { packageId },
      select: { quantity: true },
    });

    return packingTasks.length > 0 ? packageData?.quantity.toNumber() || 0 : 0;
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
