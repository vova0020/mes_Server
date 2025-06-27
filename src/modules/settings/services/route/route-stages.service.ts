import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CreateRouteStageDto,
  UpdateRouteStageDto,
  ReorderRouteStagesDto,
} from '../../dto/route/routes.dto';
import { EventsService } from '../../../websocket/services/events.service';
import { WebSocketRooms } from '../../../websocket/types/rooms.types';

@Injectable()
export class RouteStagesService {
  private readonly logger = new Logger(RouteStagesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  // ================================
  // CRUD операции для этапов маршрута
  // ================================

  /**
   * Получить все этапы маршрута
   */
  async getRouteStages(routeId: number) {
    const startTime = Date.now();
    this.logger.log(`Запрос на получение этапов маршрута с ID: ${routeId}`);

    try {
      const route = await this.prisma.route.findUnique({
        where: { routeId },
      });

      if (!route) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка получения этапов несуществующего маршрута с ID ${routeId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Маршрут с ID ${routeId} не найден`);
      }

      const stages = await this.prisma.routeStage.findMany({
        where: { routeId },
        include: {
          stage: true,
          substage: true,
        },
        orderBy: {
          sequenceNumber: 'asc',
        },
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Получено ${stages.length} этапов для маршрута "${route.routeName}" за ${executionTime}ms`,
      );

      return stages;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при получении этапов маршрута ID: ${routeId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Создать этап маршрута
   */
  async createRouteStage(
    routeId: number,
    createRouteStageDto: CreateRouteStageDto,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на создание этапа для маршрута ID: ${routeId}, данные: ${JSON.stringify(createRouteStageDto)}`,
    );

    try {
      const route = await this.prisma.route.findUnique({
        where: { routeId },
      });

      if (!route) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка создания этапа для несуществующего маршрута с ID ${routeId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Маршрут с ID ${routeId} не найден`);
      }

      // Проверяем существование этапа уровня 1
      const stage = await this.prisma.productionStageLevel1.findUnique({
        where: { stageId: createRouteStageDto.stageId },
      });

      if (!stage) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Этап уровня 1 с ID ${createRouteStageDto.stageId} не найден за ${executionTime}ms`,
        );
        throw new NotFoundException(
          `Этап уровня 1 с ID ${createRouteStageDto.stageId} не найден`,
        );
      }

      // Если указан substageId, проверяем его существование
      if (createRouteStageDto.substageId) {
        const substage = await this.prisma.productionStageLevel2.findUnique({
          where: { substageId: createRouteStageDto.substageId },
        });

        if (!substage) {
          const executionTime = Date.now() - startTime;
          this.logger.warn(
            `Этап уровня 2 с ID ${createRouteStageDto.substageId} не найден за ${executionTime}ms`,
          );
          throw new NotFoundException(
            `Этап уровня 2 с ID ${createRouteStageDto.substageId} не найден`,
          );
        }

        // Проверяем, что substage принадлежит указанному stage
        if (substage.stageId !== createRouteStageDto.stageId) {
          const executionTime = Date.now() - startTime;
          this.logger.warn(
            `Этап уровня 2 (ID: ${createRouteStageDto.substageId}) не принадлежит этапу уровня 1 (ID: ${createRouteStageDto.stageId}) за ${executionTime}ms`,
          );
          throw new BadRequestException(
            'Этап уровня 2 не принадлежит указанному этапу уровня 1',
          );
        }
      }

      // Получаем следующий номер последовательности
      const lastStage = await this.prisma.routeStage.findFirst({
        where: { routeId },
        orderBy: { sequenceNumber: 'desc' },
      });

      const sequenceNumber =
        createRouteStageDto.sequenceNumber ||
        (lastStage
          ? new Decimal(lastStage.sequenceNumber.toString()).plus(1).toNumber()
          : 1);

      const routeStage = await this.prisma.routeStage.create({
        data: {
          routeId,
          stageId: createRouteStageDto.stageId,
          substageId: createRouteStageDto.substageId,
          sequenceNumber: new Decimal(sequenceNumber),
        },
        include: {
          stage: true,
          substage: true,
        },
      });

      // Отправляем событие о связывании этапа с линией в комнату производственных этапов
      this.eventsService.emitToRoom(
        WebSocketRooms.SETTINGS_PRODUCTION_STAGES,
        'stageLevel1Created',
        {
          stage: routeStage,
          timestamp: new Date().toISOString(),
        },
      );

      // Также отправляем событие в комнату производственных линий
      this.eventsService.emitToRoom(
        WebSocketRooms.SETTINGS_PRODUCTION_LINES,
        'stageLinkedToLine',
        {
          lineId: routeId,
          stageId: routeStage.stageId,
          lineName: route.routeName,
          stageName: routeStage.stage.stageName,
          timestamp: new Date().toISOString(),
        },
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Создан этап маршрута ID: ${routeStage.routeStageId} для маршрута "${route.routeName}", этап: "${stage.stageName}"${
          routeStage.substage ? ` > "${routeStage.substage.substageName}"` : ''
        }, позиция: ${sequenceNumber} за ${executionTime}ms`,
      );

      return routeStage;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Ошибка при создании этапа маршрута для ID: ${routeId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Обновить этап маршрута
   */
  async updateRouteStage(
    routeStageId: number,
    updateRouteStageDto: UpdateRouteStageDto,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на обновление этапа маршрута ID: ${routeStageId}, данные: ${JSON.stringify(updateRouteStageDto)}`,
    );

    try {
      const routeStage = await this.prisma.routeStage.findUnique({
        where: { routeStageId },
        include: {
          route: true,
          stage: true,
          substage: true,
        },
      });

      if (!routeStage) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка обновления несуществующего этапа маршрута с ID ${routeStageId} за ${executionTime}ms`,
        );
        throw new NotFoundException(
          `Этап маршрута с ID ${routeStageId} не найден`,
        );
      }

      const oldStageName = routeStage.stage.stageName;
      const oldSubstageName = routeStage.substage?.substageName;

      // Проверяем существование нового этапа уровня 1, если он указан
      let newStageName = oldStageName;
      if (updateRouteStageDto.stageId) {
        const stage = await this.prisma.productionStageLevel1.findUnique({
          where: { stageId: updateRouteStageDto.stageId },
        });

        if (!stage) {
          const executionTime = Date.now() - startTime;
          this.logger.warn(
            `Этап уровня 1 с ID ${updateRouteStageDto.stageId} не найден за ${executionTime}ms`,
          );
          throw new NotFoundException(
            `Этап уровня 1 с ID ${updateRouteStageDto.stageId} не найден`,
          );
        }
        newStageName = stage.stageName;
      }

      // Проверяем существование нового этапа уровня 2, если он указан
      let newSubstageName = oldSubstageName;
      if (updateRouteStageDto.substageId) {
        const substage = await this.prisma.productionStageLevel2.findUnique({
          where: { substageId: updateRouteStageDto.substageId },
        });

        if (!substage) {
          const executionTime = Date.now() - startTime;
          this.logger.warn(
            `Этап уровня 2 с ID ${updateRouteStageDto.substageId} не найден за ${executionTime}ms`,
          );
          throw new NotFoundException(
            `Этап уровня 2 с ID ${updateRouteStageDto.substageId} не найден`,
          );
        }

        // Проверяем принадлежность substage к stage
        const stageId = updateRouteStageDto.stageId || routeStage.stageId;
        if (substage.stageId !== stageId) {
          const executionTime = Date.now() - startTime;
          this.logger.warn(
            `Этап уровня 2 (ID: ${updateRouteStageDto.substageId}) не принадлежит этапу уровня 1 (ID: ${stageId}) за ${executionTime}ms`,
          );
          throw new BadRequestException(
            'Этап уровня 2 не принадлежит указанному этапу уровня 1',
          );
        }
        newSubstageName = substage.substageName;
      }

      const updatedRouteStage = await this.prisma.routeStage.update({
        where: { routeStageId },
        data: {
          stageId: updateRouteStageDto.stageId,
          substageId: updateRouteStageDto.substageId,
          sequenceNumber: updateRouteStageDto.sequenceNumber
            ? new Decimal(updateRouteStageDto.sequenceNumber)
            : undefined,
        },
        include: {
          stage: true,
          substage: true,
        },
      });

      // Отправляем событие об обновлении этапа в комнату производственных этапов
      this.eventsService.emitToRoom(
        WebSocketRooms.SETTINGS_PRODUCTION_STAGES,
        'stageLevel1Updated',
        {
          stage: updatedRouteStage,
          timestamp: new Date().toISOString(),
        },
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Обновлен этап маршрута ID: ${routeStageId} для маршрута "${routeStage.route.routeName}" с "${oldStageName}${
          oldSubstageName ? ` > ${oldSubstageName}` : ''
        }" на "${newStageName}${
          newSubstageName ? ` > ${newSubstageName}` : ''
        }" за ${executionTime}ms`,
      );

      return updatedRouteStage;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Ошибка при обновлении этапа маршрута ID: ${routeStageId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Удалить этап маршрута
   */
  async deleteRouteStage(routeStageId: number) {
    const startTime = Date.now();
    this.logger.log(`Запрос на удаление этапа маршрута с ID: ${routeStageId}`);

    try {
      const routeStage = await this.prisma.routeStage.findUnique({
        where: { routeStageId },
        include: {
          route: true,
          stage: true,
          substage: true,
          partRouteProgress: true,
          palletStageProgress: true,
          subassemblyProgress: true,
          returnStageParts: true,
        },
      });

      if (!routeStage) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка удаления несуществующего этапа маршрута с ID ${routeStageId} за ${executionTime}ms`,
        );
        throw new NotFoundException(
          `Этап маршрута с ID ${routeStageId} не найден`,
        );
      }

      // Проверяем, не используется ли этап в других таблицах
      const usageCount =
        routeStage.partRouteProgress.length +
        routeStage.palletStageProgress.length +
        routeStage.subassemblyProgress.length +
        routeStage.returnStageParts.length;

      if (usageCount > 0) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка удаления используемого этапа маршрута "${routeStage.stage.stageName}" (ID: ${routeStageId}), используется в ${usageCount} записях за ${executionTime}ms`,
        );
        throw new BadRequestException(
          `Невозможно удалить этап маршрута. Он используется в ${usageCount} записях`,
        );
      }

      await this.prisma.routeStage.delete({
        where: { routeStageId },
      });

      // Отправляем событие об отвязке этапа от линии в комнату производственных линий
      this.eventsService.emitToRoom(
        WebSocketRooms.SETTINGS_PRODUCTION_LINES,
        'stageUnlinkedFromLine',
        {
          lineId: routeStage.routeId,
          stageId: routeStage.stageId,
          lineName: routeStage.route.routeName,
          stageName: routeStage.stage.stageName,
          timestamp: new Date().toISOString(),
        },
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Удален этап маршрута "${routeStage.stage.stageName}${
          routeStage.substage ? ` > ${routeStage.substage.substageName}` : ''
        }" (ID: ${routeStageId}) из маршрута "${
          routeStage.route.routeName
        }" за ${executionTime}ms`,
      );

      return { message: 'Этап маршрута успешно удален' };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Ошибка при удалении этапа маршрута ID: ${routeStageId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // ================================
  // Управление последовательностью этапов
  // ================================

  /**
   * Изменить порядок этапов в маршруте
   */
  async reorderRouteStages(routeId: number, reorderDto: ReorderRouteStagesDto) {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на изменение порядка этапов маршрута ID: ${routeId}, новый порядок: ${JSON.stringify(reorderDto.stageIds)}`,
    );

    try {
      const route = await this.prisma.route.findUnique({
        where: { routeId },
      });

      if (!route) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка изменения порядка этапов несуществующего маршрута с ID ${routeId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Маршрут с ID ${routeId} не найден`);
      }

      // Проверяем, что все переданные этапы существуют и принадлежат маршруту
      const existingStages = await this.prisma.routeStage.findMany({
        where: {
          routeId,
          routeStageId: { in: reorderDto.stageIds },
        },
      });

      if (existingStages.length !== reorderDto.stageIds.length) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Некоторые этапы не найдены или не принадлежат маршруту ID: ${routeId}, ожидалось: ${reorderDto.stageIds.length}, найдено: ${existingStages.length} за ${executionTime}ms`,
        );
        throw new BadRequestException(
          'Некоторые этапы не найдены или не принадлежат маршруту',
        );
      }

      // Обновляем порядок этапов
      await this.prisma.$transaction(async (prisma) => {
        for (let i = 0; i < reorderDto.stageIds.length; i++) {
          await prisma.routeStage.update({
            where: { routeStageId: reorderDto.stageIds[i] },
            data: { sequenceNumber: new Decimal(i + 1) },
          });
        }
      });

      const reorderedStages = await this.getRouteStages(routeId);

      // Отправляем событие об обновлении этапов линии в комнату производственных линий
      this.eventsService.emitToRoom(
        WebSocketRooms.SETTINGS_PRODUCTION_LINES,
        'lineStagesUpdated',
        {
          lineId: routeId,
          lineName: route.routeName,
          stages: reorderedStages,
          timestamp: new Date().toISOString(),
        },
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Успешно изменен порядок ${reorderDto.stageIds.length} этапов в маршруте "${route.routeName}" за ${executionTime}ms`,
      );

      return reorderedStages;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Ошибка при изменении порядка этапов маршрута ID: ${routeId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Переместить этап на новую позицию
   */
  async moveRouteStage(routeStageId: number, newSequenceNumber: number) {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на перемещение этапа маршрута ID: ${routeStageId} на позицию ${newSequenceNumber}`,
    );

    try {
      const routeStage = await this.prisma.routeStage.findUnique({
        where: { routeStageId },
        include: {
          route: true,
        },
      });

      if (!routeStage) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка перемещения несуществующего этапа маршрута с ID ${routeStageId} за ${executionTime}ms`,
        );
        throw new NotFoundException(
          `Этап маршрута с ID ${routeStageId} не найден`,
        );
      }

      const routeId = routeStage.routeId;
      const oldSequenceNumber = new Decimal(
        routeStage.sequenceNumber.toString(),
      );
      const newSeqNum = new Decimal(newSequenceNumber);

      await this.prisma.$transaction(async (prisma) => {
        if (newSeqNum.gt(oldSequenceNumber)) {
          // Перемещение вниз - сдвигаем все этапы между старой и новой позицией вверх
          await prisma.routeStage.updateMany({
            where: {
              routeId,
              sequenceNumber: {
                gt: oldSequenceNumber,
                lte: newSeqNum,
              },
            },
            data: {
              sequenceNumber: {
                decrement: 1,
              },
            },
          });
        } else {
          // Перемещение вверх - сдвигаем все этапы между новой и старой позицией вниз
          await prisma.routeStage.updateMany({
            where: {
              routeId,
              sequenceNumber: {
                gte: newSeqNum,
                lt: oldSequenceNumber,
              },
            },
            data: {
              sequenceNumber: {
                increment: 1,
              },
            },
          });
        }

        // Обновляем позицию перемещаемого этапа
        await prisma.routeStage.update({
          where: { routeStageId },
          data: { sequenceNumber: newSeqNum },
        });
      });

      const updatedStages = await this.getRouteStages(routeId);

      // Отправляем событие об обновлении этапов линии в комнату производственных линий
      this.eventsService.emitToRoom(
        WebSocketRooms.SETTINGS_PRODUCTION_LINES,
        'lineStagesUpdated',
        {
          lineId: routeId,
          lineName: routeStage.route.routeName,
          stages: updatedStages,
          timestamp: new Date().toISOString(),
        },
      );

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Успешно перемещен этап маршрута ID: ${routeStageId} с позиции ${oldSequenceNumber.toNumber()} на позицию ${newSequenceNumber} в маршруте "${routeStage.route.routeName}" за ${executionTime}ms`,
      );

      return updatedStages;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при перемещении этапа маршрута ID: ${routeStageId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // ================================
  // Вспомогательные методы
  // ================================

  /**
   * Создать несколько этапов маршрута (используется в транзакциях)
   */
  async createRouteStages(
    routeId: number,
    stages: CreateRouteStageDto[],
    prisma: any,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `Создание ${stages.length} этапов для маршрута ID: ${routeId}`,
    );

    try {
      for (let i = 0; i < stages.length; i++) {
        const stage = stages[i];
        await prisma.routeStage.create({
          data: {
            routeId,
            stageId: stage.stageId,
            substageId: stage.substageId,
            sequenceNumber: new Decimal(stage.sequenceNumber || i + 1),
          },
        });
        this.logger.log(
          `Создан этап ${i + 1}/${stages.length} для маршрута ID: ${routeId}`,
        );
      }

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Успешно создано ${stages.length} этапов для маршрута ID: ${routeId} за ${executionTime}ms`,
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Ошибка при создании этапов для маршрута ID: ${routeId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Получить доступные этапы уровня 1 для маршрута
   */
  async getAvailableStagesLevel1() {
    const startTime = Date.now();
    this.logger.log('Запрос на получение доступных этапов уровня 1');

    try {
      const stages = await this.prisma.productionStageLevel1.findMany({
        include: {
          productionStagesLevel2: true,
        },
        orderBy: {
          stageName: 'asc',
        },
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Получено ${stages.length} доступных этапов уровня 1 за ${executionTime}ms`,
      );

      return stages;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Ошибка при получении доступных этапов уровня 1 за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Получить доступные этапы уровня 2 для определенного этапа уровня 1
   */
  async getAvailableStagesLevel2(stageId: number) {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на получение доступных этапов уровня 2 для этапа ID: ${stageId}`,
    );

    try {
      const stages = await this.prisma.productionStageLevel2.findMany({
        where: { stageId },
        orderBy: {
          substageName: 'asc',
        },
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Получено ${stages.length} доступных этапов уровня 2 для этапа ID: ${stageId} за ${executionTime}ms`,
      );

      return stages;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Ошибка при получении доступных этапов уровня 2 для этапа ID: ${stageId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }
}
