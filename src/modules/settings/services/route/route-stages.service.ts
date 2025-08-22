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


@Injectable()
export class RouteStagesService {
  private readonly logger = new Logger(RouteStagesService.name);

  constructor(
    private prisma: PrismaService,

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

      const routeStage = await this.prisma.$transaction(async (prisma) => {
        // Создаем этап маршрута
        const newRouteStage = await prisma.routeStage.create({
          data: {
            routeId,
            stageId: createRouteStageDto.stageId,
            substageId: createRouteStageDto.substageId,
            sequenceNumber: new Decimal(sequenceNumber),
          },
          include: {
            stage: true,
            substage: true,
            route: true,
          },
        });

        // Если у маршрута есть производственная линия, создаем связь этапа с линией
        if (newRouteStage.route.lineId) {
          const existingLink = await prisma.lineStage.findFirst({
            where: {
              lineId: newRouteStage.route.lineId,
              stageId: createRouteStageDto.stageId,
            },
          });

          if (!existingLink) {
            await prisma.lineStage.create({
              data: {
                lineId: newRouteStage.route.lineId,
                stageId: createRouteStageDto.stageId,
              },
            });

            this.logger.log(
              `Создана связь этапа "${newRouteStage.stage.stageName}" с производственной линией ID: ${newRouteStage.route.lineId}`,
            );
          }
        }

        return newRouteStage;
      });

      // Отправляем событие о связывании этапа с линией в комнату производственных этапов
      

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
   * Удалить этап маршрута с проверкой принадлежности к маршруту
   * @param routeId ID маршрута
   * @param routeStageId ID этапа маршрута
   */
  async deleteRouteStage(routeId: number, routeStageId: number) {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на удаление этапа ${routeStageId} из маршрута ${routeId}`,
    );

    try {
      // Проверяем существование маршрута
      const route = await this.prisma.route.findUnique({
        where: { routeId },
      });

      if (!route) {
        throw new NotFoundException(`Маршрут с ID ${routeId} не найден`);
      }

      // Находим этап с проверкой принадлежности к маршруту
      const routeStage = await this.prisma.routeStage.findFirst({
        where: {
          routeStageId,
          routeId, // Важно: проверяем принадлежность к указанному маршруту
        },
        include: {
          stage: true,
          substage: true,
          route: true,
        },
      });

      if (!routeStage) {
        throw new NotFoundException(
          `Этап с ID ${routeStageId} не найден в маршруте ${routeId}`,
        );
      }

      // Проверяем, не используется ли этап
      const usageCount = await this.prisma.partRouteProgress.count({
        where: {
          routeStageId,
        },
      });

      if (usageCount > 0) {
        throw new BadRequestException(
          `Этап с ID ${routeStageId} используется в процессе производства и не может быть удален`,
        );
      }

      // Удаляем этап
      await this.prisma.routeStage.delete({
        where: {
          routeStageId,
        },
      });

      // Отправляем событие об удалении этапа
     

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Этап "${routeStage.stage.stageName}"${
          routeStage.substage ? ` > "${routeStage.substage.substageName}"` : ''
        } успешно удален из маршрута "${route.routeName}" за ${executionTime}ms`,
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
        `Ошибка при удалении этапа ${routeStageId} из маршрута ${routeId} за ${executionTime}ms`,
        error instanceof Error ? error.stack : undefined,
      );
      throw error;
    }
  }

  /**
   * Удалить все этапы из маршрута и связь с линией
   */
  async deleteAllRouteStages(routeId: number) {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на удаление всех этапов из маршрута с ID: ${routeId}`,
    );

    try {
      const route = await this.prisma.route.findUnique({
        where: { routeId },
        include: {
          routeStages: {
            include: {
              stage: true,
              substage: true,
              partRouteProgress: true,
              palletStageProgress: true,
              subassemblyProgress: true,
              returnStageParts: true,
            },
          },
        },
      });

      if (!route) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка удаления этапов несуществующего маршрута с ID ${routeId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Маршрут с ID ${routeId} не найден`);
      }

      if (route.routeStages.length === 0) {
        const executionTime = Date.now() - startTime;
        this.logger.log(
          `Маршрут "${route.routeName}" (ID: ${routeId}) не содержит этапов за ${executionTime}ms`,
        );
        return { message: 'Маршрут не содержит этапов для удаления' };
      }

      // Проверяем, не используются ли этапы в других таблицах
      let totalUsageCount = 0;
      const usageDetails: string[] = [];

      for (const routeStage of route.routeStages) {
        const usageCount =
          routeStage.partRouteProgress.length +
          routeStage.palletStageProgress.length +
          routeStage.subassemblyProgress.length +
          routeStage.returnStageParts.length;

        if (usageCount > 0) {
          totalUsageCount += usageCount;
          usageDetails.push(
            `"${routeStage.stage.stageName}${
              routeStage.substage
                ? ` > ${routeStage.substage.substageName}`
                : ''
            }" (${usageCount} записей)`,
          );
        }
      }

      if (totalUsageCount > 0) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка удаления используемых этапов маршрута "${route.routeName}" (ID: ${routeId}), используется в ${totalUsageCount} записях: ${usageDetails.join(', ')} за ${executionTime}ms`,
        );
        throw new BadRequestException(
          `Невозможно удалить этапы маршрута. Они используются в ${totalUsageCount} записях: ${usageDetails.join(', ')}`,
        );
      }

      const deletedStagesCount = route.routeStages.length;
      const stageIds = [...new Set(route.routeStages.map((rs) => rs.stageId))];

      await this.prisma.$transaction(async (prisma) => {
        // Удаляем все этапы маршрута
        await prisma.routeStage.deleteMany({
          where: { routeId },
        });

        this.logger.log(
          `Удалено ${deletedStagesCount} этапов из маршрута "${route.routeName}" (ID: ${routeId})`,
        );

        // Если у маршрута есть производственная линия, удаляем связи этапов с линией
        if (route.lineId && stageIds.length > 0) {
          // Проверяем, остались ли другие маршруты с этими этапами на той же прои��водственной линии
          for (const stageId of stageIds) {
            const otherRoutesWithStage = await prisma.routeStage.findFirst({
              where: {
                stageId: stageId,
                route: {
                  lineId: route.lineId,
                },
              },
            });

            // Если других маршрутов с этим этапом на этой линии нет, удаляем связь
            if (!otherRoutesWithStage) {
              await prisma.lineStage.deleteMany({
                where: {
                  lineId: route.lineId,
                  stageId: stageId,
                },
              });

              this.logger.log(
                `Удалена связь этапа ID: ${stageId} с производственной линией ID: ${route.lineId}, так как этап больше не используется в маршрутах этой линии`,
              );
            }
          }
        }

        // Отключаем маршрут от производственной линии
        await prisma.route.update({
          where: { routeId },
          data: { lineId: null },
        });

        this.logger.log(
          `Маршрут "${route.routeName}" (ID: ${routeId}) отключен от производственной линии`,
        );
      });

      // Отправляем событие об обновлении этапов линии (все этапы удалены)
      

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Успешно удалены все ${deletedStagesCount} этапов из маршрута "${route.routeName}" (ID: ${routeId}) и отключена связь с производственной линией за ${executionTime}ms`,
      );

      return {
        message: `Успешно удалены все ${deletedStagesCount} этапов из маршрута и отключена связь с производственной линией`,
        deletedStagesCount: deletedStagesCount,
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Ошибка при удалении всех этапов маршрута ID: ${routeId} за ${executionTime}ms`,
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
            stageId: Number(stage.stageId),
            substageId: stage.substageId ? Number(stage.substageId) : undefined,
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
   * Получить все связанные этапы по ID производст��енной линии
   */
  async getLineStages(lineId: number) {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на получение этапов для производственной линии ID: ${lineId}`,
    );

    try {
      // Проверяем существование производственной линии
      const productionLine = await this.prisma.productionLine.findUnique({
        where: { lineId },
      });

      if (!productionLine) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Производственная линия с ID ${lineId} не найдена за ${executionTime}ms`,
        );
        throw new NotFoundException(
          `Производственная линия с ID ${lineId} не найдена`,
        );
      }

      // Получаем этапы, связанные с производственной линией через таблицу lines_stages
      const lineStages = await this.prisma.lineStage.findMany({
        where: { lineId },
        include: {
          stage: {
            include: {
              productionStagesLevel2: true, // Получаем все подэтапы для каждого этапа
            },
          },
        },
      });

      // Собираем этапы 1 уровня
      const stagesLevel1 = lineStages.map((lineStage) => ({
        stageId: lineStage.stage.stageId,
        stageName: lineStage.stage.stageName,
        description: lineStage.stage.description,
        finalStage: lineStage.stage.finalStage,
        createdAt: lineStage.stage.createdAt,
        updatedAt: lineStage.stage.updatedAt,
      }));

      // Собираем все этапы 2 уровня для найденных этапов 1 уровня
      const stagesLevel2Map = new Map();
      lineStages.forEach((lineStage) => {
        lineStage.stage.productionStagesLevel2.forEach((substage) => {
          if (!stagesLevel2Map.has(substage.substageId)) {
            stagesLevel2Map.set(substage.substageId, {
              substageId: substage.substageId,
              stageId: substage.stageId,
              substageName: substage.substageName,
              description: substage.description,
              allowance: substage.allowance,
            });
          }
        });
      });

      // Получаем количество маршрутов для этой линии
      const routesCount = await this.prisma.route.count({
        where: { lineId },
      });

      const result = {
        productionLine: {
          lineId: productionLine.lineId,
          lineName: productionLine.lineName,
          lineType: productionLine.lineType,
        },
        stagesLevel1,
        stagesLevel2: Array.from(stagesLevel2Map.values()),
        routesCount,
      };

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Получено ${result.stagesLevel1.length} этапов уровня 1 и ${result.stagesLevel2.length} этапов уровня 2 для производственной линии "${productionLine.lineName}" за ${executionTime}ms`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при получении этапов для производственной линии ID: ${lineId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }
}
