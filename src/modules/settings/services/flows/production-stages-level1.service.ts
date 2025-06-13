import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import {
  CreateProductionStageLevel1Dto,
  UpdateProductionStageLevel1Dto,
  ProductionStageLevel1ResponseDto,
} from '../../dto/production-stage-level1.dto';
import { EventsService } from '../../../websocket/services/events.service';

@Injectable()
export class ProductionStagesLevel1Service {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async create(
    createDto: CreateProductionStageLevel1Dto,
  ): Promise<ProductionStageLevel1ResponseDto> {
    // Проверяем уникальность названия операции
    const existingStage =
      await this.prismaService.productionStageLevel1.findFirst({
        where: { stageName: createDto.stageName },
      });

    if (existingStage) {
      throw new ConflictException(
        'Технологическая операция с таким названием уже существует',
      );
    }

    const stage = await this.prismaService.productionStageLevel1.create({
      data: createDto,
      include: {
        _count: {
          select: { productionStagesLevel2: true },
        },
      },
    });

    const newStage = {
      stageId: stage.stageId,
      stageName: stage.stageName,
      description: stage.description || undefined,
      createdAt: stage.createdAt,
      updatedAt: stage.updatedAt,
      substagesCount: stage._count.productionStagesLevel2,
    };

    // Отправляем событие о создании технологической операции
    this.eventsService.emitToRoom('productionStages', 'stageLevel1Created', {
      stage: newStage,
      timestamp: new Date().toISOString(),
    });

    return newStage;
  }

  async findAll(): Promise<ProductionStageLevel1ResponseDto[]> {
    const stages = await this.prismaService.productionStageLevel1.findMany({
      include: {
        _count: {
          select: { productionStagesLevel2: true },
        },
      },
      orderBy: { stageName: 'asc' },
    });

    return stages.map((stage) => ({
      stageId: stage.stageId,
      stageName: stage.stageName,
      description: stage.description || undefined,
      createdAt: stage.createdAt,
      updatedAt: stage.updatedAt,
      substagesCount: stage._count.productionStagesLevel2,
    }));
  }

  async findOne(id: number): Promise<ProductionStageLevel1ResponseDto> {
    const stage = await this.prismaService.productionStageLevel1.findUnique({
      where: { stageId: id },
      include: {
        productionStagesLevel2: {
          orderBy: { substageName: 'asc' },
        },
      },
    });

    if (!stage) {
      throw new NotFoundException(
        `Технологическая операция с ID ${id} не найдена`,
      );
    }

    return {
      stageId: stage.stageId,
      stageName: stage.stageName,
      description: stage.description || undefined,
      createdAt: stage.createdAt,
      updatedAt: stage.updatedAt,
      substagesCount: stage.productionStagesLevel2.length,
      substages: stage.productionStagesLevel2.map((substage) => ({
        substageId: substage.substageId,
        stageId: substage.stageId,
        substageName: substage.substageName,
        description: substage.description || undefined,
        allowance: Number(substage.allowance),
      })),
    };
  }

  async update(
    id: number,
    updateDto: UpdateProductionStageLevel1Dto,
  ): Promise<ProductionStageLevel1ResponseDto> {
    const existingStage =
      await this.prismaService.productionStageLevel1.findUnique({
        where: { stageId: id },
      });

    if (!existingStage) {
      throw new NotFoundException(
        `Технологическая операция с ID ${id} не найдена`,
      );
    }

    // Проверяем уникальность нового названия (если оно изменяется)
    if (
      updateDto.stageName &&
      updateDto.stageName !== existingStage.stageName
    ) {
      const duplicateStage =
        await this.prismaService.productionStageLevel1.findFirst({
          where: {
            stageName: updateDto.stageName,
            stageId: { not: id },
          },
        });

      if (duplicateStage) {
        throw new ConflictException(
          'Технологическая операция с таким названием уже существует',
        );
      }
    }

    const updatedStage = await this.prismaService.productionStageLevel1.update({
      where: { stageId: id },
      data: updateDto,
      include: {
        _count: {
          select: { productionStagesLevel2: true },
        },
      },
    });

    const stageResponse = {
      stageId: updatedStage.stageId,
      stageName: updatedStage.stageName,
      description: updatedStage.description || undefined,
      createdAt: updatedStage.createdAt,
      updatedAt: updatedStage.updatedAt,
      substagesCount: updatedStage._count.productionStagesLevel2,
    };

    // Отправляем событие об обновлении технологической операции
    this.eventsService.emitToRoom('productionStages', 'stageLevel1Updated', {
      stage: stageResponse,
      timestamp: new Date().toISOString(),
    });

    return stageResponse;
  }

  async remove(id: number): Promise<void> {
    const stage = await this.prismaService.productionStageLevel1.findUnique({
      where: { stageId: id },
      include: {
        _count: {
          select: {
            productionStagesLevel2: true,
            routeStages: true,
            linesStages: true,
            machinesStages: true,
          },
        },
      },
    });

    if (!stage) {
      throw new NotFoundException(
        `Технологическая операция с ID ${id} не найдена`,
      );
    }

    // Проверяем, используется ли операция
    if (
      stage._count.routeStages > 0 ||
      stage._count.linesStages > 0 ||
      stage._count.machinesStages > 0
    ) {
      throw new ConflictException(
        'Нельзя удалить технологическую операцию, которая используется в потоках, линиях или станках',
      );
    }

    // Проверяем, есть ли связанные подэтапы
    if (stage._count.productionStagesLevel2 > 0) {
      throw new ConflictException(
        'Нельзя удалить технологическую операцию, у которой есть подэтапы. Сначала удалите все подэтапы',
      );
    }

    await this.prismaService.productionStageLevel1.delete({
      where: { stageId: id },
    });

    // Отправляем событие об удалении технологической операции
    this.eventsService.emitToRoom('productionStages', 'stageLevel1Deleted', {
      stageId: id,
      stageName: stage.stageName,
      timestamp: new Date().toISOString(),
    });
  }
}
