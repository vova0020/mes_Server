import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { PalletsResponseDto } from '../dto/pallet-machin.dto';
import { EventsGateway } from 'src/modules/websocket/events.gateway';

@Injectable()
export class PalletsMachineTaskService {
  constructor(
    private prisma: PrismaService,
    private readonly eventsGateway: EventsGateway,
  ) { }

  /**
   * Получить все поддоны по ID детали
   * @param detailId ID детали (теперь partId в новой схеме)
   * @param segmentId ID производственного участка (теперь stageId в новой схеме)
   * @returns Список поддонов с информацией о буфере, станке и текущем прогрессе
   */
  async getPalletsByDetailId(
    detailId: number,
    segmentId: number,
    machineId: number,
  ): Promise<PalletsResponseDto> {
    // В новой схеме detailId становится partId, а segmentId становится stageId
    const partId = detailId;
    const stageId = segmentId;

    // Проверяем, существует ли деталь (теперь Part)
    const part = await this.prisma.part.findUnique({
      where: { partId: partId },
      include: {
        material: true, // Получаем информацию о материале
        route: {
          include: {
            routeStages: {
              include: {
                stage: true,
                substage: true,
              },
              orderBy: {
                sequenceNumber: 'asc',
              },
            },
          },
        },
      },
    });

    if (!part) {
      throw new NotFoundException(`Деталь с ID ${partId} не найдена`);
    }

    // Проверяем, существует ли этап (теперь ProductionStageLevel1)
    const stage = await this.prisma.productionStageLevel1.findUnique({
      where: { stageId: stageId },
    });

    if (!stage) {
      throw new NotFoundException(
        `Этап производства с ID ${stageId} не найден`,
      );
    }

    // Получаем все поддоны для указанной детали
    const pallets = await this.prisma.pallet.findMany({
      where: {
        partId,
        // вот фильтр по активным заданиям на этот станок:
        machineAssignments: {
          some: {
            machineId,
            completedAt: null,
          },
        },
      },
      select: {
        palletId: true,
        palletName: true,
        quantity: true,
        partId: true,
        part: {
          include: {
            material: true,
          },
        },
        // Текущие размещения в буфере
        palletBufferCells: {
          where: {
            removedAt: null, // Активные размещения
          },
          include: {
            cell: {
              include: {
                buffer: true,
              },
            },
          },
          take: 1,
          orderBy: {
            placedAt: 'desc',
          },
        },
        // Текущие назначения на станки
        machineAssignments: {
          where: {
            completedAt: null, // Активные назначения
          },
          include: {
            machine: true,
          },
          take: 1,
        },
        // Прогресс по этапам
        palletStageProgress: {
          include: {
            routeStage: {
              include: {
                stage: true,
                substage: true,
              },
            },
          },
          orderBy: {
            pspId: 'desc',
          },
        },
      },
    });

    // Получаем общую статистику по детали для указанного этапа
    const partProgressStats = await this.getPartProgressStats(partId, stageId);

    // Преобразуем данные в формат DTO
    const palletDtos = await Promise.all(
      pallets.map(async (pallet) => {
        // Определяем текущий этап и его прогресс
        const currentStageProgress = await this.getCurrentStageProgress(
          pallet,
          stageId,
        );
        const processingStatus = await this.getProcessingStatus(
          pallet,
          stageId,
        );

        // Получаем информацию о станке из активного назначения
        const machine =
          pallet.machineAssignments.length > 0
            ? pallet.machineAssignments[0].machine
            : null;

        return {
          id: pallet.palletId,
          name: pallet.palletName,
          quantity: Number(pallet.quantity), // Количество берется из поддона
          part: {
            id: pallet.part.partId,
            article: pallet.part.partCode,
            name: pallet.part.partName,
            material: pallet.part.material.materialName,
            size: pallet.part.size,
            totalNumber: Number(pallet.quantity),
            status: pallet.part.status,
            readyForProcessing: partProgressStats.readyForProcessing,
            completed: partProgressStats.completed,
            isCompletedForStage: partProgressStats.isCompletedForStage,
          },
          currentStageId: currentStageProgress?.routeStage.stageId || null,
          currentStageName:
            currentStageProgress?.routeStage.stage.stageName || null,
          bufferCell:
            pallet.palletBufferCells.length > 0
              ? {
                id: pallet.palletBufferCells[0].cell.cellId,
                code: pallet.palletBufferCells[0].cell.cellCode,
                bufferId: pallet.palletBufferCells[0].cell.bufferId,
                bufferName:
                  pallet.palletBufferCells[0].cell.buffer.bufferName,
              }
              : null,
          machine: machine
            ? {
              id: machine.machineId,
              name: machine.machineName,
              status: machine.status,
            }
            : null,
          currentStageProgress: currentStageProgress
            ? {
              id: currentStageProgress.pspId,
              status: currentStageProgress.status,
              completedAt: currentStageProgress.completedAt,
              routeStage: {
                id: currentStageProgress.routeStage.routeStageId,
                name: currentStageProgress.routeStage.stage.stageName,
                sequence: Number(
                  currentStageProgress.routeStage.sequenceNumber,
                ),
              },
            }
            : null,
          processingStatus,
        };
      }),
    );

    return {
      pallets: palletDtos,
      total: palletDtos.length,
    };
  }

  /**
   * Получает статистику прогресса детали для указанного этапа
   */
  private async getPartProgressStats(partId: number, stageId: number) {
    // Подсчитываем общий прогресс по детали для указанного этапа
    const totalProgressCount = await this.prisma.partRouteProgress.count({
      where: {
        partId: partId,
        routeStage: {
          stageId: stageId,
        },
      },
    });

    const completedProgressCount = await this.prisma.partRouteProgress.count({
      where: {
        partId: partId,
        routeStage: {
          stageId: stageId,
        },
        status: 'COMPLETED',
      },
    });

    const pendingProgressCount = await this.prisma.partRouteProgress.count({
      where: {
        partId: partId,
        routeStage: {
          stageId: stageId,
        },
        status: 'PENDING',
      },
    });

    return {
      readyForProcessing: pendingProgressCount,
      completed: completedProgressCount,
      isCompletedForStage:
        totalProgressCount > 0 && totalProgressCount === completedProgressCount,
    };
  }

  /**
   * Получает текущий прогресс этапа для поддона
   */
  private async getCurrentStageProgress(pallet: any, targetStageId: number) {
    // Ищем прогресс для целевого этапа
    const stageProgress = pallet.palletStageProgress.find(
      (progress: any) => progress.routeStage.stageId === targetStageId,
    );

    if (stageProgress) {
      return stageProgress;
    }

    // Если нет прогресса для целевого этапа, ищем текущий активный прогресс
    const activeProgress = pallet.palletStageProgress.find(
      (progress: any) =>
        progress.status === 'IN_PROGRESS' || progress.status === 'PENDING',
    );

    return activeProgress || null;
  }

  /**
   * Получает информацию о статусе обработки поддона
   */
  private async getProcessingStatus(pallet: any, targetStageId: number) {
    // Определяем, является ли целевой этап первым в маршруте
    const isFirstStageInRoute = await this.isFirstStageForPallet(
      pallet,
      targetStageId,
    );

    // Проверяем, завершены ли все предыдущие этапы
    const hasCompletedPreviousStages = await this.hasCompletedPreviousStages(
      pallet,
      targetStageId,
    );

    // Получаем информацию о текущем и следующем этапах
    const { currentStage, nextStage } = await this.getCurrentAndNextStages(
      pallet,
      targetStageId,
    );

    return {
      isFirstStageInRoute,
      hasCompletedPreviousStages,
      currentStage: currentStage || {
        id: targetStageId,
        name: await this.getStageNameById(targetStageId),
      },
      nextStage,
    };
  }

  /**
   * Определяет, является ли этап первым в маршруте для поддона
   */
  private async isFirstStageForPallet(
    pallet: any,
    targetStageId: number,
  ): Promise<boolean> {
    if (!pallet.part?.route?.routeStages?.length) {
      return false;
    }

    const firstStage = pallet.part.route.routeStages[0];
    return firstStage.stageId === targetStageId;
  }

  /**
   * Проверяет, завершены ли все предыдущие этапы
   */
  private async hasCompletedPreviousStages(
    pallet: any,
    targetStageId: number,
  ): Promise<boolean> {
    if (!pallet.part?.route?.routeStages?.length) {
      return true;
    }

    // Находим целевой этап в маршруте
    const targetStageIndex = pallet.part.route.routeStages.findIndex(
      (rs: any) => rs.stageId === targetStageId,
    );

    if (targetStageIndex === -1 || targetStageIndex === 0) {
      return true; // Если этап не найден или это первый этап
    }

    // Проверяем, завершены ли все предыдущие этапы
    const previousStages = pallet.part.route.routeStages.slice(
      0,
      targetStageIndex,
    );

    for (const stage of previousStages) {
      const progress = pallet.palletStageProgress.find(
        (p: any) => p.routeStageId === stage.routeStageId,
      );

      if (!progress || progress.status !== 'COMPLETED') {
        return false;
      }
    }

    return true;
  }

  /**
   * Получает информацию о текущем и следующем этапах
   */
  private async getCurrentAndNextStages(pallet: any, targetStageId: number) {
    // Исправляем типизацию - объявляем переменные с правильными типами
    let currentStage: { id: number; name: string } | null = null;
    let nextStage: { id: number; name: string } | null = null;

    if (!pallet.part?.route?.routeStages?.length) {
      currentStage = {
        id: targetStageId,
        name: await this.getStageNameById(targetStageId),
      };
      return { currentStage, nextStage };
    }

    // Находим текущий активный этап
    const activeProgress = pallet.palletStageProgress.find(
      (p: any) =>
        p.status === 'IN_PROGRESS' || p.status === 'PENDING',
    );

    if (activeProgress) {
      currentStage = {
        id: activeProgress.routeStage.stageId,
        name: activeProgress.routeStage.stage.stageName,
      };

      // Находим следующий этап
      const currentSequence = activeProgress.routeStage.sequenceNumber;
      const nextRouteStage = pallet.part.route.routeStages.find(
        (rs: any) => Number(rs.sequenceNumber) > Number(currentSequence),
      );

      if (nextRouteStage) {
        nextStage = {
          id: nextRouteStage.stageId,
          name: nextRouteStage.stage.stageName,
        };
      }
    } else {
      // Если нет активного прогресса, используем целевой этап как текущий
      currentStage = {
        id: targetStageId,
        name: await this.getStageNameById(targetStageId),
      };
    }

    return { currentStage, nextStage };
  }

  /**
   * Получает название этапа по его ID
   */
  private async getStageNameById(stageId: number): Promise<string> {
    const stage = await this.prisma.productionStageLevel1.findUnique({
      where: { stageId },
    });

    return stage?.stageName || `Этап ${stageId}`;
  }
}