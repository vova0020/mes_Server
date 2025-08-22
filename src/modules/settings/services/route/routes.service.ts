import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import { CreateRouteDto, UpdateRouteDto } from '../../dto/route/routes.dto';

import { RouteStagesService } from './route-stages.service';


@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    private prisma: PrismaService,

    private readonly routeStagesService: RouteStagesService,
  ) {}

  // ================================
  // CRUD операции для маршрутов
  // ================================

  /**
   * Получить все маршруты
   */
  async getAllRoutes() {
    const startTime = Date.now();
    this.logger.log('��апрос на получение всех маршрутов');

    try {
      const routes = await this.prisma.route.findMany({
        include: {
          productionLine: true,
          routeStages: {
            include: {
              stage: true,
              substage: true,
            },
            orderBy: {
              sequenceNumber: 'asc',
            },
          },
          _count: {
            select: {
              parts: true,
            },
          },
        },
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Успешно получено ${routes.length} маршрутов за ${executionTime}ms`,
      );

      return routes;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Ошибка при получении маршрутов за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Получить маршрут по ID
   */
  async getRouteById(routeId: number) {
    const startTime = Date.now();
    this.logger.log(`Запрос на получение маршрута с ID: ${routeId}`);

    try {
      const route = await this.prisma.route.findUnique({
        where: { routeId },
        include: {
          productionLine: true,
          routeStages: {
            include: {
              stage: true,
              substage: true,
            },
            orderBy: {
              sequenceNumber: 'asc',
            },
          },
          parts: {
            select: {
              partId: true,
              partName: true,
              partCode: true,
            },
          },
        },
      });

      if (!route) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Маршрут с ID ${routeId} не найден за ${executionTime}ms`,
        );
        throw new NotFoundException(`Маршрут с ID ${routeId} не найден`);
      }

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Успешно получен маршрут "${route.routeName}" с ${route.routeStages.length} этапами за ${executionTime}ms`,
      );

      return route;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при получении маршрута с ID ${routeId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Создать новый маршрут
   */
  async createRoute(createRouteDto: CreateRouteDto) {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на создание маршрута: ${JSON.stringify(createRouteDto)}`,
    );

    try {
      const { routeName, lineId } = createRouteDto;

      // Если указан lineId, проверяем существование производственной линии
      if (lineId) {
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
      }

      // Создаем маршрут
      const route = await this.prisma.route.create({
        data: {
          routeName,
          lineId,
        },
      });

      this.logger.log(
        `Создан маршрут с ID: ${route.routeId}, название: "${routeName}"${lineId ? `, линия ID: ${lineId}` : ''}`,
      );

      // Получаем созданный маршрут со всеми связанными данными
      const newRoute = await this.getRouteById(route.routeId);

      // Отправляем событие о создании маршрута в комнату производственных линий
     

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Маршрут "${newRoute.routeName}" успешно создан с ID: ${newRoute.routeId} за ${executionTime}ms`,
      );

      return newRoute;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при создании маршрута "${createRouteDto.routeName}" за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Обновить маршрут
   */
  async updateRoute(routeId: number, updateRouteDto: UpdateRouteDto) {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на обновление маршрута ID: ${routeId}, данные: ${JSON.stringify(updateRouteDto)}`,
    );

    try {
      const route = await this.prisma.route.findUnique({
        where: { routeId },
      });

      if (!route) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка обновления несуществующего маршрута с ID ${routeId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Маршрут с ID ${routeId} не найден`);
      }

      // Если указан новый lineId, проверяем существование производственной линии
      if (updateRouteDto.lineId !== undefined) {
        if (updateRouteDto.lineId !== null) {
          const productionLine = await this.prisma.productionLine.findUnique({
            where: { lineId: updateRouteDto.lineId },
          });

          if (!productionLine) {
            const executionTime = Date.now() - startTime;
            this.logger.warn(
              `Производственная линия с ID ${updateRouteDto.lineId} не найдена за ${executionTime}ms`,
            );
            throw new NotFoundException(
              `Производственная линия с ID ${updateRouteDto.lineId} не найдена`,
            );
          }
        }
      }

      // Преобразуем stages в stageIds, если передано поле stages
      if (updateRouteDto.stages && updateRouteDto.stages.length > 0) {
        updateRouteDto.stageIds = updateRouteDto.stages
          .sort((a, b) => (a.sequenceNumber || 0) - (b.sequenceNumber || 0))
          .map(stage => stage.stageId);
      }

      // Валидация этапов, если они переданы и есть линия
      if (updateRouteDto.stageIds && updateRouteDto.stageIds.length > 0) {
        const targetLineId =
          updateRouteDto.lineId !== undefined
            ? updateRouteDto.lineId
            : route.lineId;

        if (targetLineId !== null) {
          // Проверяем, что все переданные этапы действительно связаны с линией
          const validStages = await this.prisma.lineStage.findMany({
            where: {
              lineId: targetLineId,
              stageId: { in: updateRouteDto.stageIds },
            },
          });

          if (validStages.length !== updateRouteDto.stageIds.length) {
            const invalidStageIds = updateRouteDto.stageIds.filter(
              (stageId) => !validStages.some((vs) => vs.stageId === stageId),
            );
            throw new BadRequestException(
              `Этапы с ID [${invalidStageIds.join(', ')}] не связаны с линией ID: ${targetLineId}`,
            );
          }
        }
      }

      const oldName = route.routeName;
      const oldLineId = route.lineId;
      const lineIdChanged =
        updateRouteDto.lineId !== undefined &&
        updateRouteDto.lineId !== oldLineId;
      const stagesChanged = updateRouteDto.stageIds !== undefined || updateRouteDto.stages !== undefined;

      // Выполняем обновление в транзакции
      await this.prisma.$transaction(async (prisma) => {
        // Обновляем основную информацию маршрута
        await prisma.route.update({
          where: { routeId },
          data: {
            routeName: updateRouteDto.routeName,
            lineId: updateRouteDto.lineId,
          },
        });

        // Обновляем этапы, если они переданы
        if (stagesChanged) {
          this.logger.log(
            `Обновление этапов маршрута ID: ${routeId}`,
          );

          if (updateRouteDto.stageIds && updateRouteDto.stageIds.length > 0) {
            // Получаем существующие этапы
            const existingStages = await prisma.routeStage.findMany({
              where: { routeId },
              orderBy: { sequenceNumber: 'asc' },
            });

            // Обновляем существующие этапы или создаем новые
            for (let i = 0; i < updateRouteDto.stageIds.length; i++) {
              const stageId = Number(updateRouteDto.stageIds[i]);
              const sequenceNumber = i + 1;

              if (i < existingStages.length) {
                // Обновляем существующий этап
                await prisma.routeStage.update({
                  where: { routeStageId: existingStages[i].routeStageId },
                  data: {
                    stageId,
                    sequenceNumber,
                  },
                });
              } else {
                // Создаем новый этап
                await prisma.routeStage.create({
                  data: {
                    routeId,
                    stageId,
                    sequenceNumber,
                  },
                });
              }
            }

            // Проверяем и удаляем лишние этапы, если новых меньше чем было
            if (existingStages.length > updateRouteDto.stageIds.length) {
              const stagesToDelete = existingStages.slice(updateRouteDto.stageIds.length);
              
              // Проверяем, не используются ли этапы в производстве
              for (const stage of stagesToDelete) {
                const usageCount = await prisma.partRouteProgress.count({
                  where: { routeStageId: stage.routeStageId },
                });
                
                if (usageCount > 0) {
                  throw new BadRequestException(
                    `Невозможно удалить этап маршрута. Этап используется в ${usageCount} деталях на производстве`
                  );
                }
              }
              
              // Если этапы не используются, удаляем их
              const stageIdsToDelete = stagesToDelete.map(stage => stage.routeStageId);
              await prisma.routeStage.deleteMany({
                where: {
                  routeStageId: { in: stageIdsToDelete },
                },
              });
              
              this.logger.log(
                `Удалено ${stagesToDelete.length} лишних этапов из маршрута ID: ${routeId}`
              );
            }

            this.logger.log(
              `Обновлено ${updateRouteDto.stageIds.length} этапов маршрута ID: ${routeId}: [${updateRouteDto.stageIds.join(', ')}]`,
            );
          }
        }
      });

      const updatedRoute = await this.getRouteById(routeId);

      // Отправляем событие об обновлении маршрута в комнату производственных линий
      

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Маршрут ID: ${routeId} успешно обновлен с "${oldName}" на "${updateRouteDto.routeName || oldName}"${
          updateRouteDto.lineId !== undefined
            ? `, линия изменена с ${oldLineId} на ${updateRouteDto.lineId}`
            : ''
        } за ${executionTime}ms`,
      );

      return updatedRoute;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при обновлении маршрута ID: ${routeId} за ${executionTime}ms`,
        error instanceof Error ? error.stack : String(error),
      );
      throw error;
    }
  }

  /**
   * Удалить маршрут
   */
  async deleteRoute(routeId: number) {
    const startTime = Date.now();
    this.logger.log(`Запрос на удаление маршрута с ID: ${routeId}`);

    try {
      const route = await this.prisma.route.findUnique({
        where: { routeId },
        include: {
          parts: true,
        },
      });

      if (!route) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка удаления несуществующего маршрута с ID ${routeId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Маршрут с ID ${routeId} не найден`);
      }

      // Проверяем, не используется ли маршрут в деталях
      if (route.parts.length > 0) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка удаления используемого маршрута "${route.routeName}" (ID: ${routeId}), используется в ${route.parts.length} деталях за ${executionTime}ms`,
        );
        throw new BadRequestException(
          `Невозможно удалить маршрут. Он используется в ${route.parts.length} деталях`,
        );
      }

      await this.prisma.route.delete({
        where: { routeId },
      });

      // Отправляем событие об удалении маршрута в комнату производственных линий
      

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Маршрут "${route.routeName}" (ID: ${routeId}) успешно удален за ${executionTime}ms`,
      );

      return { message: 'Маршрут успешно удален' };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Ошибка при удалении маршрута ID: ${routeId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Скопировать маршрут
   */
  async copyRoute(routeId: number, newRouteName: string) {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на копирование маршрута ID: ${routeId} с новым названием: "${newRouteName}"`,
    );

    try {
      const originalRoute = await this.getRouteById(routeId);

      const copiedRoute = await this.prisma.$transaction(async (prisma) => {
        // Создаем новый маршрут
        const newRoute = await prisma.route.create({
          data: {
            routeName: newRouteName,
            lineId: originalRoute.lineId,
          },
        });

        this.logger.log(
          `Создан новый маршрут с ID: ${newRoute.routeId} для копирования`,
        );

        // Копируем все этапы
        for (const stage of originalRoute.routeStages) {
          await prisma.routeStage.create({
            data: {
              routeId: newRoute.routeId,
              stageId: stage.stageId,
              substageId: stage.substageId,
              sequenceNumber: stage.sequenceNumber,
            },
          });
        }

        this.logger.log(
          `Скопировано ${originalRoute.routeStages.length} этапов в новый маршрут`,
        );

        // Если у оригинального маршрута есть производственная линия и этапы, создаем связи
        if (originalRoute.lineId && originalRoute.routeStages.length > 0) {
          const stageIds = originalRoute.routeStages.map(
            (stage) => stage.stageId,
          );
          const uniqueStageIds = [...new Set(stageIds)];

          this.logger.log(
            `Создание связей ${uniqueStageIds.length} этапов с производственной линией ID: ${originalRoute.lineId} для скопированного маршрута`,
          );

          // Создаем связи только для тех этапов, которые еще не связаны с линией
          for (const stageId of uniqueStageIds) {
            const existingLink = await prisma.lineStage.findFirst({
              where: {
                lineId: originalRoute.lineId,
                stageId: stageId,
              },
            });

            if (!existingLink) {
              await prisma.lineStage.create({
                data: {
                  lineId: originalRoute.lineId,
                  stageId: Number(stageId),
                },
              });
            }
          }
        }

        return newRoute.routeId;
      });

      // Получаем скопированный маршрут со всеми данными
      const finalCopiedRoute = await this.getRouteById(copiedRoute);

      // Отправляем событие о копировании маршрута в комнату производственных линий
      

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Маршрут "${originalRoute.routeName}" успешно скопирован как "${newRouteName}" (ID: ${finalCopiedRoute.routeId}) за ${executionTime}ms`,
      );

      return finalCopiedRoute;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Ошибка при копировании маршрута ID: ${routeId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Получить все потоки с информацией о занятости
   */
  async getAllProductionLines() {
    const startTime = Date.now();
    this.logger.log('Запрос на получение всех производственных линий');

    try {
      const productionLines = await this.prisma.productionLine.findMany({
        include: {
          _count: {
            select: {
              routes: true,
            },
          },
          routes: {
            select: {
              routeId: true,
              routeName: true,
            },
          },
        },
        orderBy: {
          lineName: 'asc',
        },
      });

      // Добавляем информацию о занятости линии
      const linesWithStatus = productionLines.map((line) => ({
        ...line,
        isOccupied: line._count.routes > 0, // Линия занята, если есть связанные маршруты
        routesCount: line._count.routes,
      }));

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Успешно получено ${productionLines.length} производственных линий за ${executionTime}ms`,
      );

      return linesWithStatus;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Ошибка при получении производственных линий за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }
}
