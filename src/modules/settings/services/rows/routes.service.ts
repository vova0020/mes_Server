import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import { Decimal } from '@prisma/client/runtime/library';
import {
  CreateRouteDto,
  UpdateRouteDto,
  CreateRouteStageDto,
  UpdateRouteStageDto,
  ReorderRouteStagesDto,
} from '../../dto/route/routes.dto';

@Injectable()
export class RoutesService {
  constructor(private prisma: PrismaService) {}

  // ================================
  // CRUD операции для маршрутов
  // ================================

  /**
   * Получить все маршруты
   */
  async getAllRoutes() {
    return this.prisma.route.findMany({
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
  }

  /**
   * Получить маршрут по ID
   */
  async getRouteById(routeId: number) {
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
      throw new NotFoundException(`Маршрут с ID ${routeId} не найден`);
    }

    return route;
  }

  /**
   * Создать новый маршрут
   */
  async createRoute(createRouteDto: CreateRouteDto) {
    const { routeName, stages } = createRouteDto;

    return this.prisma.$transaction(async (prisma) => {
      // Создаем маршрут
      const route = await prisma.route.create({
        data: {
          routeName,
        },
      });

      // Если переданы этапы, создаем их
      if (stages && stages.length > 0) {
        await this.createRouteStages(route.routeId, stages, prisma);
      }

      return this.getRouteById(route.routeId);
    });
  }

  /**
   * Обновить маршрут
   */
  async updateRoute(routeId: number, updateRouteDto: UpdateRouteDto) {
    const route = await this.prisma.route.findUnique({
      where: { routeId },
    });

    if (!route) {
      throw new NotFoundException(`Маршрут с ID ${routeId} не найден`);
    }

    await this.prisma.route.update({
      where: { routeId },
      data: {
        routeName: updateRouteDto.routeName,
      },
    });

    return this.getRouteById(routeId);
  }

  /**
   * Удалить маршрут
   */
  async deleteRoute(routeId: number) {
    const route = await this.prisma.route.findUnique({
      where: { routeId },
      include: {
        parts: true,
      },
    });

    if (!route) {
      throw new NotFoundException(`Маршрут с ID ${routeId} не найден`);
    }

    // Проверяем, не используется ли маршрут в деталях
    if (route.parts.length > 0) {
      throw new BadRequestException(
        `Невозможно удалить маршрут. Он используется в ${route.parts.length} деталях`,
      );
    }

    await this.prisma.route.delete({
      where: { routeId },
    });

    return { message: 'Маршрут успешно удален' };
  }

  // ================================
  // CRUD операции для этапов маршрута
  // ================================

  /**
   * Получить все этапы маршрута
   */
  async getRouteStages(routeId: number) {
    const route = await this.prisma.route.findUnique({
      where: { routeId },
    });

    if (!route) {
      throw new NotFoundException(`Маршрут с ID ${routeId} не найден`);
    }

    return this.prisma.routeStage.findMany({
      where: { routeId },
      include: {
        stage: true,
        substage: true,
      },
      orderBy: {
        sequenceNumber: 'asc',
      },
    });
  }

  /**
   * Создать этап маршрута
   */
  async createRouteStage(
    routeId: number,
    createRouteStageDto: CreateRouteStageDto,
  ) {
    const route = await this.prisma.route.findUnique({
      where: { routeId },
    });

    if (!route) {
      throw new NotFoundException(`Маршрут с ID ${routeId} не найден`);
    }

    // Проверяем существование этапа уровня 1
    const stage = await this.prisma.productionStageLevel1.findUnique({
      where: { stageId: createRouteStageDto.stageId },
    });

    if (!stage) {
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
        throw new NotFoundException(
          `Этап уровня 2 с ID ${createRouteStageDto.substageId} не найден`,
        );
      }

      // Проверяем, что substage принадлежит указанному stage
      if (substage.stageId !== createRouteStageDto.stageId) {
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

    const sequenceNumber = createRouteStageDto.sequenceNumber || 
      (lastStage ? new Decimal(lastStage.sequenceNumber.toString()).plus(1).toNumber() : 1);

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

    return routeStage;
  }

  /**
   * Обновить этап маршрута
   */
  async updateRouteStage(
    routeStageId: number,
    updateRouteStageDto: UpdateRouteStageDto,
  ) {
    const routeStage = await this.prisma.routeStage.findUnique({
      where: { routeStageId },
    });

    if (!routeStage) {
      throw new NotFoundException(
        `Этап маршрута с ID ${routeStageId} не найден`,
      );
    }

    // Проверяем существование нового этапа уровня 1, если о�� указан
    if (updateRouteStageDto.stageId) {
      const stage = await this.prisma.productionStageLevel1.findUnique({
        where: { stageId: updateRouteStageDto.stageId },
      });

      if (!stage) {
        throw new NotFoundException(
          `Этап уровня 1 с ID ${updateRouteStageDto.stageId} не найден`,
        );
      }
    }

    // Проверяем существование нового этапа уровня 2, если он указан
    if (updateRouteStageDto.substageId) {
      const substage = await this.prisma.productionStageLevel2.findUnique({
        where: { substageId: updateRouteStageDto.substageId },
      });

      if (!substage) {
        throw new NotFoundException(
          `Этап уровня 2 с ID ${updateRouteStageDto.substageId} не найден`,
        );
      }

      // Проверяем принадлежность substage к stage
      const stageId = updateRouteStageDto.stageId || routeStage.stageId;
      if (substage.stageId !== stageId) {
        throw new BadRequestException(
          'Этап уровня 2 не принадлежит указанному этапу уровня 1',
        );
      }
    }

    const updatedRouteStage = await this.prisma.routeStage.update({
      where: { routeStageId },
      data: {
        stageId: updateRouteStageDto.stageId,
        substageId: updateRouteStageDto.substageId,
        sequenceNumber: updateRouteStageDto.sequenceNumber ? 
          new Decimal(updateRouteStageDto.sequenceNumber) : undefined,
      },
      include: {
        stage: true,
        substage: true,
      },
    });

    return updatedRouteStage;
  }

  /**
   * Удалить этап маршрута
   */
  async deleteRouteStage(routeStageId: number) {
    const routeStage = await this.prisma.routeStage.findUnique({
      where: { routeStageId },
      include: {
        partRouteProgress: true,
        palletStageProgress: true,
        subassemblyProgress: true,
        returnStageParts: true,
      },
    });

    if (!routeStage) {
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
      throw new BadRequestException(
        `Невозможно удалить этап маршрута. Он используется в ${usageCount} записях`,
      );
    }

    await this.prisma.routeStage.delete({
      where: { routeStageId },
    });

    return { message: 'Этап маршрута успешно удален' };
  }

  // ================================
  // Управление последовательностью этапов
  // ================================

  /**
   * Изменить порядок этапов в маршруте
   */
  async reorderRouteStages(routeId: number, reorderDto: ReorderRouteStagesDto) {
    const route = await this.prisma.route.findUnique({
      where: { routeId },
    });

    if (!route) {
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

    return this.getRouteStages(routeId);
  }

  /**
   * Переместить этап на новую позицию
   */
  async moveRouteStage(routeStageId: number, newSequenceNumber: number) {
    const routeStage = await this.prisma.routeStage.findUnique({
      where: { routeStageId },
    });

    if (!routeStage) {
      throw new NotFoundException(
        `Этап маршрута с ID ${routeStageId} не найден`,
      );
    }

    const routeId = routeStage.routeId;
    const oldSequenceNumber = new Decimal(routeStage.sequenceNumber.toString());
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

    return this.getRouteStages(routeId);
  }

  // ================================
  // Вспомогательные методы
  // ================================

  /**
   * Создать несколько этапов маршрута (используется в транзакциях)
   */
  private async createRouteStages(
    routeId: number,
    stages: CreateRouteStageDto[],
    prisma: any,
  ) {
    for (let i = 0; i < stages.length; i++) {
      const stage = stages[i];
      await prisma.routeStage.create({
        data: {
          routeId,
          stageId: stage.stageId,
          substageId: stage.substageId,
          sequenceNumber: new Decimal(stage.sequenceNumber || (i + 1)),
        },
      });
    }
  }

  /**
   * Получить доступные этапы уровня 1 для маршрута
   */
  async getAvailableStagesLevel1() {
    return this.prisma.productionStageLevel1.findMany({
      include: {
        productionStagesLevel2: true,
      },
      orderBy: {
        stageName: 'asc',
      },
    });
  }

  /**
   * Получить доступные этапы уровня 2 для определенно��о этапа уровня 1
   */
  async getAvailableStagesLevel2(stageId: number) {
    return this.prisma.productionStageLevel2.findMany({
      where: { stageId },
      orderBy: {
        substageName: 'asc',
      },
    });
  }

  /**
   * Скопировать маршрут
   */
  async copyRoute(routeId: number, newRouteName: string) {
    const originalRoute = await this.getRouteById(routeId);

    return this.prisma.$transaction(async (prisma) => {
      // Создаем новый маршрут
      const newRoute = await prisma.route.create({
        data: {
          routeName: newRouteName,
        },
      });

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

      return this.getRouteById(newRoute.routeId);
    });
  }
}