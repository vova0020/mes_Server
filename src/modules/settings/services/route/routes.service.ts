import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import {
  CreateRouteDto,
  UpdateRouteDto,
} from '../../dto/route/routes.dto';
import { EventsService } from '../../../websocket/services/events.service';
import { RouteStagesService } from './route-stages.service';

@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly eventsService: EventsService,
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
    this.logger.log('Запрос на получение всех маршрутов');

    try {
      const routes = await this.prisma.route.findMany({
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
      const { routeName, stages } = createRouteDto;

      // Создаем маршрут и этапы в транзакции
      const createdRouteId = await this.prisma.$transaction(async (prisma) => {
        // Создаем маршрут
        const route = await prisma.route.create({
          data: {
            routeName,
          },
        });

        this.logger.log(
          `Создан маршрут с ID: ${route.routeId}, название: "${routeName}"`,
        );

        // Если переданы этапы, создаем их
        if (stages && stages.length > 0) {
          this.logger.log(`Создание ${stages.length} этапов для маршрута`);
          await this.routeStagesService.createRouteStages(route.routeId, stages, prisma);
        }

        return route.routeId;
      });

      // Получаем созданны�� маршрут со всеми связанными данными после коммита транзакции
      const newRoute = await this.getRouteById(createdRouteId);

      // Отправляем событие о создании маршрута
      this.eventsService.emitToRoom('routes', 'routeCreated', {
        route: newRoute,
        timestamp: new Date().toISOString(),
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Маршрут "${newRoute.routeName}" успешно создан с ID: ${newRoute.routeId} за ${executionTime}ms`,
      );

      return newRoute;
    } catch (error) {
      const executionTime = Date.now() - startTime;
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

      const oldName = route.routeName;

      await this.prisma.route.update({
        where: { routeId },
        data: {
          routeName: updateRouteDto.routeName,
        },
      });

      const updatedRoute = await this.getRouteById(routeId);

      // Отправляем событие об обновлении маршрута
      this.eventsService.emitToRoom('routes', 'routeUpdated', {
        route: updatedRoute,
        timestamp: new Date().toISOString(),
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Маршрут ID: ${routeId} успешно обновлен с "${oldName}" на "${updateRouteDto.routeName}" за ${executionTime}ms`,
      );

      return updatedRoute;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при обновлении маршрута ID: ${routeId} за ${executionTime}ms`,
        error.stack,
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

      // Отправляем событие об удалении маршрута
      this.eventsService.emitToRoom('routes', 'routeDeleted', {
        routeId: routeId,
        routeName: route.routeName,
        timestamp: new Date().toISOString(),
      });

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

        return newRoute.routeId;
      });

      // Получаем скопированный маршрут со всеми данными
      const finalCopiedRoute = await this.getRouteById(copiedRoute);

      // Отправляем событие о копировании маршрута
      this.eventsService.emitToRoom('routes', 'routeCopied', {
        originalRoute: originalRoute,
        copiedRoute: finalCopiedRoute,
        timestamp: new Date().toISOString(),
      });

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
}