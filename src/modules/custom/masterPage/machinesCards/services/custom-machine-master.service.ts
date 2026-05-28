import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../../shared/prisma.service';
import { ProductionType } from '@prisma/client';
import { CustomMachineSegmentResponseDto } from '../dto/custom-machine-master.dto';

@Injectable()
export class CustomMachineMasterService {
  private readonly logger = new Logger(CustomMachineMasterService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Получить все станки по ID участка для индивидуального производства
   * @param stageId ID производственного участка (этапа 1-го уровня)
   * @returns Массив объектов с информацией о станках
   */
  async getMachinesBySegmentId(
    stageId: number,
  ): Promise<CustomMachineSegmentResponseDto[]> {
    this.logger.log(
      `Получение станков индивидуального производства для участка с ID: ${stageId}`,
    );

    try {
      // Проверяем существование участка
      const stage = await this.prisma.productionStageLevel1.findUnique({
        where: { stageId: stageId },
      });

      if (!stage) {
        throw new NotFoundException(`Участок с ID ${stageId} не найден`);
      }

      // Получаем станки для индивидуального производства
      const machines = await this.prisma.machine.findMany({
        where: {
          machinesStages: {
            some: {
              stageId: stageId,
            },
          },
          // Фильтруем по типу производства: CUSTOM или BOTH
          productionType: {
            in: [ProductionType.CUSTOM, ProductionType.BOTH],
          },
        },
      });

      if (machines.length === 0) {
        this.logger.warn(
          `Для участка с ID ${stageId} не найдено станков индивидуального производства`,
        );
        return [];
      }

      // Формируем ответ без расчета выполненного количества
      // TODO: Добавить расчет после создания таблицы истории операций для индивидуального производства
      const resultMachines = machines.map((machine) => {
        return {
          id: machine.machineId,
          name: machine.machineName,
          status: machine.status,
          load_unit: machine.loadUnit,
          noSmenTask: machine.noSmenTask,
          recommendedLoad: Number(machine.recommendedLoad),
          plannedQuantity: 0, // TODO: Рассчитывать из заданий индивидуального производства
          completedQuantity: 0, // TODO: Рассчитывать из истории операций индивидуального производства
          productionType: machine.productionType,
        };
      });

      this.logger.log(
        `Успешно получено ${resultMachines.length} станков индивидуального производства для участка с ID ${stageId}`,
      );
      return resultMachines;
    } catch (error) {
      this.logger.error(
        `Ошибка при получении станков для участка с ID ${stageId}: ${(error as Error).message}`,
      );
      throw error;
    }
  }
}
