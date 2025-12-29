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
        select: {
          machineId: true,
          machineName: true,
          status: true,
          loadUnit: true,
          recommendedLoad: true,
          counterResetAt: true,
          partiallyCompleted: true,
          packingTasks: {
            where: {
              status: { in: ['PENDING', 'IN_PROGRESS', 'PARTIALLY_COMPLETED'] },
            },
            include: {
              package: true,
            },
          },
        },
      });

      // Группируем выполненное количество по станкам с учетом времени сброса счетчика
      const completedByMachine = {};
      
      for (const machine of machines) {
        // Получаем завершенные задачи после сброса счетчика
        const completedTasks = await this.prisma.packingTask.findMany({
          where: {
            machineId: machine.machineId,
            ...(machine.counterResetAt && {
              completedAt: {
                gte: machine.counterResetAt,
              },
            }),
            status: 'COMPLETED',
          },
        });
        
        // Получаем частично выполненные задачи после сброса счетчика
        const partialTasks = await this.prisma.packingTask.findMany({
          where: {
            machineId: machine.machineId,
            ...(machine.counterResetAt && {
              assignedAt: {
                gte: machine.counterResetAt,
              },
            }),
            status: { in: ['IN_PROGRESS', 'PARTIALLY_COMPLETED'] },
            completedQuantity: { gt: 0 },
          },
        });
        
        const completedAmount = completedTasks.reduce(
          (sum, task) => sum + task.completedQuantity.toNumber(),
          0,
        );
        
        const partialAmount = partialTasks.reduce(
          (sum, task) => sum + task.completedQuantity.toNumber(),
          0,
        );
        
        // Также учитываем сохраненное частично выполненное количество
        const savedPartialAmount = machine.partiallyCompleted?.toNumber() || 0;
        
        completedByMachine[machine.machineId] = completedAmount + partialAmount + savedPartialAmount;
      }

      // Формируем ответ
      const result = machines.map((machine) => {
        const assignedQuantity = machine.packingTasks.reduce(
          (total, task) => total + task.assignedQuantity.toNumber(),
          0,
        );

        const completedQuantity = completedByMachine[machine.machineId] || 0;
        
        // Вычитаем выполненное из назначенного
        const inProgressCompletedQty = machine.packingTasks
          .filter(task => task.status === 'IN_PROGRESS' || task.status === 'PARTIALLY_COMPLETED')
          .reduce((sum, task) => sum + task.completedQuantity.toNumber(), 0);
        
        const plannedQuantity = Math.max(0, assignedQuantity - inProgressCompletedQty);

        return {
          id: machine.machineId,
          name: machine.machineName,
          status: machine.status,
          load_unit: machine.loadUnit,
          recommendedLoad: machine.recommendedLoad.toNumber(),
          plannedQuantity,
          completedQuantity,
          // Добавляем информацию о прогрессе
          inProgressQuantity: inProgressCompletedQty,
          // Показываем сохраненное частично выполненное количество
          partiallyCompletedStored: machine.partiallyCompleted?.toNumber() || 0,
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

    // Ищем существующее задание на том же станке для той же упаковки
    const existingTaskOnMachine = await this.prisma.packingTask.findFirst({
      where: {
        packageId: dto.packageId,
        machineId: dto.machineId,
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

    const requestedQuantity = dto.assignedQuantity ?? productionPackage.quantity.toNumber();

    if (existingTaskOnMachine) {
      // Обновляем существующее задание - прибавляем количество
      const newAssignedQuantity = existingTaskOnMachine.assignedQuantity.toNumber() + requestedQuantity;
      
      // Проверяем общий лимит
      const allTasks = await this.prisma.packingTask.findMany({
        where: {
          packageId: dto.packageId,
          taskId: { not: existingTaskOnMachine.taskId },
          status: {
            in: [
              PackingTaskStatus.NOT_PROCESSED,
              PackingTaskStatus.PENDING,
              PackingTaskStatus.IN_PROGRESS,
              PackingTaskStatus.PARTIALLY_COMPLETED,
            ],
          },
        },
      });
      
      const otherTasksTotal = allTasks.reduce(
        (sum, task) => sum + task.assignedQuantity.toNumber(),
        0,
      );
      
      if (otherTasksTotal + newAssignedQuantity > productionPackage.quantity.toNumber()) {
        throw new BadRequestException(
          `Превышено количество упаковки. Уже назначено на другие станки: ${otherTasksTotal}, на данном станке: ${existingTaskOnMachine.assignedQuantity.toNumber()}, запрашивается добавить: ${requestedQuantity}, доступно: ${productionPackage.quantity.toNumber()}`,
        );
      }

      const updatedTask = await this.prisma.packingTask.update({
        where: { taskId: existingTaskOnMachine.taskId },
        data: {
          assignedQuantity: newAssignedQuantity,
          assignedTo: dto.assignedTo ?? existingTaskOnMachine.assignedTo,
          priority: dto.priority ?? existingTaskOnMachine.priority.toNumber(),
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

      return this.mapToResponseDto(updatedTask);
    } else {
      // Проверяем общее назначенное количество для новой записи
      const existingTasks = await this.prisma.packingTask.findMany({
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
      });

      const totalAssigned = existingTasks.reduce(
        (sum, task) => sum + task.assignedQuantity.toNumber(),
        0,
      );

      if (totalAssigned + requestedQuantity > productionPackage.quantity.toNumber()) {
        throw new BadRequestException(
          `Превышено количество упаковки. Уже назначено: ${totalAssigned}, запрашивается: ${requestedQuantity}, доступно: ${productionPackage.quantity.toNumber()}`,
        );
      }

      // Создаем новое задание
      const assignedQty = dto.assignedQuantity ?? productionPackage.quantity.toNumber();
      const newTask = await this.prisma.packingTask.create({
        data: {
          packageId: dto.packageId,
          machineId: dto.machineId,
          assignedTo: dto.assignedTo,
          status: PackingTaskStatus.PENDING,
          priority: dto.priority ?? 0,
          assignedAt: new Date(),
          assignedQuantity: assignedQty,
          completedQuantity: 0,
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

  // Получение заданий по станку с данными о частичной обработке
  async getAssignmentsByMachine(machineId: number): Promise<PackingAssignmentResponseDto[]> {
    const machine = await this.prisma.machine.findUnique({
      where: { machineId },
    });

    if (!machine) {
      throw new NotFoundException(`Станок с ID ${machineId} не найден`);
    }

    const tasks = await this.prisma.packingTask.findMany({
      where: {
        machineId,
        status: { not: 'COMPLETED' },
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
      orderBy: [{ priority: 'desc' }, { assignedAt: 'asc' }],
    });

    return tasks.map((task) => ({
      ...this.mapToResponseDto(task),
      // Добавляем данные о частичной обработке для каждого задания
      remainingQuantity: task.assignedQuantity.toNumber() - task.completedQuantity.toNumber(),
    }));
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

  /**
   * Обновить частично выполненное количество на станке
   * @param machineId ID станка
   * @param additionalQuantity Дополнительное количество для добавления
   */
  async updateMachinePartialProgress(machineId: number, additionalQuantity: number): Promise<void> {
    await this.prisma.machine.update({
      where: { machineId },
      data: {
        partiallyCompleted: {
          increment: additionalQuantity,
        },
      },
    });
  }

  /**
   * Сбросить счетчик частично выполненного количества на станке
   * @param machineId ID станка
   */
  async resetMachinePartialProgress(machineId: number): Promise<void> {
    await this.prisma.machine.update({
      where: { machineId },
      data: {
        partiallyCompleted: 0,
        counterResetAt: new Date(),
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
