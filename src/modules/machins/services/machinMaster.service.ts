import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { TaskStatus, MachineStatus } from '@prisma/client';
import { MachineSegmentResponseDto } from 'src/modules/machins/dto/machine-segment.dto';
import {
  MachineTaskResponseDto,
  MoveTaskDto,
} from 'src/modules/machins/dto/machine-task.dto';

@Injectable()
export class MachinMasterService {
  private readonly logger = new Logger(MachinMasterService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Получение списка станков с включением связанных данных
  async getMachines(segmentId?: number) {
    this.logger.log(
      `Запрос на получение списка станков${segmentId ? ` для участка: ${segmentId}` : ''}`,
    );

    try {
      // Проверяем, есть ли записи в таблице
      const count = await this.prisma.machine.count();
      this.logger.log(`Найдено ${count} станков в базе данных`);

      // Строим параметры запроса в зависимости от наличия segmentId
      const where: any = {};

      if (segmentId) {
        // Если передан ID участка, фильтруем станки по участку через связь со stages
        where.machinesStages = {
          some: {
            stageId: segmentId,
          },
        };
      } else {
        // Если ID участка не передан, возвращаем только активные станки
        where.status = MachineStatus.ACTIVE;
      }

      // Получаем станки с учетом фильтров
      const machineAll = await this.prisma.machine.findMany({
        where,
        include: {
          // Включаем информацию о связанных этапах для отображения
          machinesStages: {
            include: {
              stage: {
                select: {
                  stageId: true,
                  stageName: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Получено ${machineAll.length} станков с данными`);

      return machineAll;
    } catch (error) {
      this.logger.error(`Ошибка при получении станков: ${error.message}`);
      throw error;
    }
  }

  /**
   * Получить все станки по ID участка с дополнительной информацией
   * @param stageId ID производственного участка (этапа 1-го уровня)
   * @returns Массив объектов с информацией о станках
   */
  async getMachinesBySegmentId(
    stageId: number,
  ): Promise<MachineSegmentResponseDto[]> {
    this.logger.log(`Получение станков для участка с ID: ${stageId}`);

    try {
      // Проверяем существование участка (этапа 1-го уровня)
      const stage = await this.prisma.productionStageLevel1.findUnique({
        where: { stageId: stageId },
      });

      if (!stage) {
        throw new NotFoundException(`Участок с ID ${stageId} не найден`);
      }

      // Получаем все станки данного участка че��ез связь MachineStage
      const machines = await this.prisma.machine.findMany({
        where: {
          machinesStages: {
            some: {
              stageId: stageId,
            },
          },
        },
        include: {
          // Получаем назначения для расчета запланированного количества
          machineAssignments: {
            where: {
              completedAt: null, // Только активные назначения
            },
            include: {
              pallet: {
                select: {
                  palletId: true,
                  palletName: true,
                  quantity: true,
                  part: true,
                },
              },
            },
          },
        },
      });

      if (machines.length === 0) {
        this.logger.warn(`Для участка с ID ${stageId} не найдено станков`);
        return [];
      }

      // Получаем все завершенные назначения для станков на данном участке
      const completedAssignments = await this.prisma.machineAssignment.findMany(
        {
          where: {
            machine: {
              machinesStages: {
                some: {
                  stageId: stageId,
                },
              },
            },
            completedAt: {
              not: null, // Только завершенные назначения
            },
          },
          include: {
            pallet: {
              select: {
                palletId: true,
                palletName: true,
                quantity: true,
                part: true,
              },
            },
            machine: true,
          },
        },
      );

      // Формируем объект для быстрого доступа к количеству завершенных операций по ID станка
      const completedQuantityByMachineId = completedAssignments.reduce(
        (acc, assignment) => {
          const machineId = assignment.machine.machineId;

          if (!acc[machineId]) {
            acc[machineId] = 0;
          }

          // Суммируем количество деталей на поддоне
          acc[machineId] += Number(assignment.pallet.quantity);

          return acc;
        },
        {},
      );

      // Формируем ответ с дополнительными вычисляемыми полями
      const resultMachines = machines.map((machine) => {
        // Расчет запланированного количества - суммируем количество деталей по всем активным назначениям
        const plannedQuantity = machine.machineAssignments.reduce(
          (total, assignment) => total + Number(assignment.pallet.quantity),
          0,
        );

        // Получаем выполненное количество из собранной статистики или возвращаем 0
        const completedQuantity =
          completedQuantityByMachineId[machine.machineId] || 0;

        return {
          id: machine.machineId,
          name: machine.machineName,
          status: machine.status,
          recommendedLoad: Number(machine.recommendedLoad),
          plannedQuantity,
          completedQuantity,
        };
      });

      this.logger.log(
        `Успешно получено ${resultMachines.length} станков для участка с ID ${stageId}`,
      );
      return resultMachines;
    } catch (error) {
      this.logger.error(
        `Ошибка при получении станков для участка с ID ${stageId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Получить сменное задание для станка по его ID
   * @param machineId ID станка
   * @returns Массив з��даний для станка со всеми необходимыми данными
   */
  async getMachineTasksById(
    machineId: number,
  ): Promise<MachineTaskResponseDto[]> {
    this.logger.log(`Получение сменного задания для станка с ID: ${machineId}`);

    try {
      // Проверяем существование станка
      const machine = await this.prisma.machine.findUnique({
        where: { machineId: machineId },
      });

      if (!machine) {
        throw new NotFoundException(`Станок с ID ${machineId} не найден`);
      }

      // Получаем назначения (задания) для данного станка
      const assignments = await this.prisma.machineAssignment.findMany({
        where: {
          machineId,
          completedAt: null, // Только активные назначения
        },
        include: {
          // Включаем информацию о поддоне
          pallet: {
            select: {
              palletId: true,
              palletName: true,
              quantity: true,
              // Включаем информацию о детали
              part: {
                include: {
                  // Включаем информацию о пакетах чер��з связь с ProductionPackagePart
                  productionPackageParts: {
                    include: {
                      package: {
                        include: {
                          order: true,
                        },
                      },
                    },
                  },
                  // Включаем информацию о материале
                  material: true,
                },
              },
            },
          },
        },
        // Сортировка по времени назначения
        orderBy: [{ assignedAt: 'asc' }],
      });

      if (assignments.length === 0) {
        this.logger.warn(
          `Для станка с ID ${machineId} не найдено активных заданий`,
        );
        return [];
      }

      // Формируем ответ с данными из связанных таблиц
      const tasks = assignments.map((assignment) => {
        // Получаем первую запись связи детали с пакетом для получения информации о заказе
        const packagePart = assignment.pallet.part.productionPackageParts[0];

        // Определяем статус на основе времени завершения
        let status = 'ON_MACHINE';
        let completionStatus: string | null = null;

        if (assignment.completedAt) {
          status = 'COMPLETED';
          completionStatus = 'COMPLETED';
        }

        return {
          operationId: assignment.assignmentId,
          orderId: packagePart?.package.order.orderId || 0,
          orderName:
            packagePart?.package.order.orderName || 'Неизвестный заказ',
          detailArticle: assignment.pallet.part.partCode,
          detailName: assignment.pallet.part.partName,
          detailMaterial: assignment.pallet.part.material.materialName,
          detailSize: assignment.pallet.part.size,
          palletName: assignment.pallet.palletName,
          quantity: Number(assignment.pallet.quantity),
          status: status,
          completionStatus: completionStatus,
        };
      });

      this.logger.log(
        `Успешно получено ${tasks.length} заданий для станка с ID ${machineId}`,
      );
      return tasks;
    } catch (error) {
      this.logger.error(
        `Ошибка при получении заданий для станка с ID ${machineId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Удалить задание по ID и связанные PartMachineAssignment
   * @param operationId ID операции/задания для удаления (ID назначения)
   * @returns Объект с сообщением об успешном удалении
   */
  async deleteTaskById(operationId: number): Promise<{ message: string }> {
    this.logger.log(`Удаление задания с ID: ${operationId}`);

    try {
      // Загружаем назначение вместе с информацией о паллете и машине
      const assignment = await this.prisma.machineAssignment.findUnique({
        where: { assignmentId: operationId },
        include: {
          pallet: {
            include: {
              part: true, // чтобы получить partId
            },
          },
          machine: {
            include: {
              machinesStages: true, // чтобы получить stageId для прогресса
            },
          },
        },
      });

      if (!assignment) {
        throw new NotFoundException(`Задание с ID ${operationId} не найдено`);
      }

      // Удаляем всё в одной транзакции
      await this.prisma.$transaction(async (tx) => {
        // 1) Удаляем само назначение из machine_assignments
        await tx.machineAssignment.delete({
          where: { assignmentId: operationId },
        });

        // 2) Очищаем прогресс по паллете для незавершённых этапов
        const stageIds = assignment.machine.machinesStages.map(
          (ms) => ms.stageId,
        );
        if (stageIds.length > 0) {
          const routeStages = await tx.routeStage.findMany({
            where: { stageId: { in: stageIds } },
          });
          const routeStageIds = routeStages.map((rs) => rs.routeStageId);
          if (routeStageIds.length > 0) {
            await tx.palletStageProgress.deleteMany({
              where: {
                palletId: assignment.palletId,
                routeStageId: { in: routeStageIds },
                completedAt: null,
              },
            });
          }
        }

        // 3) Удаляем все привязки детали к машине из PartMachineAssignment
        await tx.partMachineAssignment.deleteMany({
          where: {
            machineId: assignment.machineId,
            partId: assignment.pallet.part.partId,
          },
        });
      });

      this.logger.log(`Задание с ID ${operationId} успешно удалено`);
      return { message: `Задание с ID ${operationId} успешно удалено` };
    } catch (error) {
      this.logger.error(
        `Ошибка при удалении задания с ID ${operationId}: ${error.message}`,
      );
      throw error;
    }
  }

  /**
   * Переместить задание на другой станок и обновить PartMachineAssignment
   * @param moveTaskDto DTO с данными для перемещения задания
   * @returns Объект с сообщением об успешном перемещении
   */
  async moveTaskToMachine(
    moveTaskDto: MoveTaskDto,
  ): Promise<{ message: string }> {
    const { operationId, targetMachineId } = moveTaskDto;
    this.logger.log(
      `Перемещение задания с ID: ${operationId} на станок с ID: ${targetMachineId}`,
    );

    try {
      // 1) Подтягиваем текущее назначение вместе с info о паллете и детали
      const assignment = await this.prisma.machineAssignment.findUnique({
        where: { assignmentId: operationId },
        include: {
          pallet: {
            include: {
              part: true, // чтобы достать partId
            },
          },
        },
      });

      if (!assignment) {
        throw new NotFoundException(`Задание с ID ${operationId} не найдено`);
      }

      if (assignment.completedAt !== null) {
        throw new BadRequestException(
          `Нельзя перемещать завершенное задание с ID ${operationId}`,
        );
      }

      // 2) Проверяем существование целевого станка
      const targetMachine = await this.prisma.machine.findUnique({
        where: { machineId: targetMachineId },
      });
      if (!targetMachine) {
        throw new NotFoundException(`Станок с ID ${targetMachineId} не найден`);
      }

      // 3) Проводим перемещение и обновление привязки детали к станку в одной транзакции
      await this.prisma.$transaction(async (tx) => {
        // а) обновляем сам machineAssignment
        await tx.machineAssignment.update({
          where: { assignmentId: operationId },
          data: { machineId: targetMachineId },
        });

        // б) обновляем PartMachineAssignment для той же детали
        await tx.partMachineAssignment.updateMany({
          where: {
            machineId: assignment.machineId, // старый станок
            partId: assignment.pallet.part.partId,
          },
          data: {
            machineId: targetMachineId, // новый станок
          },
        });
      });

      this.logger.log(
        `Задание с ID ${operationId} успешно перемещено на станок с ID ${targetMachineId}`,
      );
      return {
        message: `Задание успешно перемещено на станок ${targetMachine.machineName}`,
      };
    } catch (error) {
      this.logger.error(
        `Ошибка при перемещении задания с ID ${operationId} на станок ${targetMachineId}: ${error.message}`,
      );
      throw error;
    }
  }
}
