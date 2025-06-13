import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import {
  CreateProductionStageLevel2Dto,
  UpdateProductionStageLevel2Dto,
  ProductionStageLevel2ResponseDto,
  LinkSubstageToStageDto,
  RebindSubstageDto,
} from '../../dto/production-stage-level2.dto';
import { EventsService } from '../../../websocket/services/events.service';

@Injectable()
export class ProductionStagesLevel2Service {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async create(
    createDto: CreateProductionStageLevel2Dto,
  ): Promise<ProductionStageLevel2ResponseDto> {
    // Проверяем существование родительского этапа
    const parentStage =
      await this.prismaService.productionStageLevel1.findUnique({
        where: { stageId: createDto.stageId },
      });

    if (!parentStage) {
      throw new NotFoundException(
        `Технологическая операция 1 уровня с ID ${createDto.stageId} не найдена`,
      );
    }

    // Проверяем уникальность названия подэтапа внутри родительского этапа
    const existingSubstage =
      await this.prismaService.productionStageLevel2.findFirst({
        where: {
          stageId: createDto.stageId,
          substageName: createDto.substageName,
        },
      });

    if (existingSubstage) {
      throw new ConflictException(
        'Подэтап с таким названием уже существует в данной технологической операции',
      );
    }

    const substage = await this.prismaService.productionStageLevel2.create({
      data: createDto,
      include: {
        stage: true,
      },
    });

    const newSubstage = {
      substageId: substage.substageId,
      stageId: substage.stageId,
      stageName: substage.stage.stageName,
      substageName: substage.substageName,
      description: substage.description || undefined,
      allowance: Number(substage.allowance),
    };

    // Отправляем событие о создании подэтапа
    this.eventsService.emitToRoom('productionStages', 'stageLevel2Created', {
      substage: newSubstage,
      timestamp: new Date().toISOString(),
    });

    return newSubstage;
  }

  async findAll(): Promise<ProductionStageLevel2ResponseDto[]> {
    const substages = await this.prismaService.productionStageLevel2.findMany({
      include: {
        stage: true,
      },
      orderBy: [{ stage: { stageName: 'asc' } }, { substageName: 'asc' }],
    });

    return substages.map((substage) => ({
      substageId: substage.substageId,
      stageId: substage.stageId,
      stageName: substage.stage.stageName,
      substageName: substage.substageName,
      description: substage.description || undefined,
      allowance: Number(substage.allowance),
    }));
  }

  async findOne(id: number): Promise<ProductionStageLevel2ResponseDto> {
    const substage = await this.prismaService.productionStageLevel2.findUnique({
      where: { substageId: id },
      include: {
        stage: true,
      },
    });

    if (!substage) {
      throw new NotFoundException(`Подэтап с ID ${id} не найден`);
    }

    return {
      substageId: substage.substageId,
      stageId: substage.stageId,
      stageName: substage.stage.stageName,
      substageName: substage.substageName,
      description: substage.description || undefined,
      allowance: Number(substage.allowance),
    };
  }

  async update(
    id: number,
    updateDto: UpdateProductionStageLevel2Dto,
  ): Promise<ProductionStageLevel2ResponseDto> {
    const existingSubstage =
      await this.prismaService.productionStageLevel2.findUnique({
        where: { substageId: id },
      });

    if (!existingSubstage) {
      throw new NotFoundException(`Подэтап с ID ${id} не найден`);
    }

    // Проверяем уникальность нового названия (если оно изменяется)
    if (
      updateDto.substageName &&
      updateDto.substageName !== existingSubstage.substageName
    ) {
      const duplicateSubstage =
        await this.prismaService.productionStageLevel2.findFirst({
          where: {
            stageId: existingSubstage.stageId,
            substageName: updateDto.substageName,
            substageId: { not: id },
          },
        });

      if (duplicateSubstage) {
        throw new ConflictException(
          'Подэтап с таким названием уже существует в данной технологической операции',
        );
      }
    }

    const updatedSubstage =
      await this.prismaService.productionStageLevel2.update({
        where: { substageId: id },
        data: updateDto,
        include: {
          stage: true,
        },
      });

    const substageResponse = {
      substageId: updatedSubstage.substageId,
      stageId: updatedSubstage.stageId,
      stageName: updatedSubstage.stage.stageName,
      substageName: updatedSubstage.substageName,
      description: updatedSubstage.description || undefined,
      allowance: Number(updatedSubstage.allowance),
    };

    // Отправляем событие об обновлении подэтапа
    this.eventsService.emitToRoom('productionStages', 'stageLevel2Updated', {
      substage: substageResponse,
      timestamp: new Date().toISOString(),
    });

    return substageResponse;
  }

  async remove(id: number): Promise<void> {
    const substage = await this.prismaService.productionStageLevel2.findUnique({
      where: { substageId: id },
      include: {
        stage: true,
        _count: {
          select: { routeStages: true },
        },
      },
    });

    if (!substage) {
      throw new NotFoundException(`Подэтап с ID ${id} не найден`);
    }

    // Проверяем, используется ли подэтап в потоках
    if (substage._count.routeStages > 0) {
      throw new ConflictException(
        'Нельзя удалить подэтап, который используется в потоках',
      );
    }

    await this.prismaService.productionStageLevel2.delete({
      where: { substageId: id },
    });

    // Отправляем событие об удалении подэтапа
    this.eventsService.emitToRoom('productionStages', 'stageLevel2Deleted', {
      substageId: id,
      substageName: substage.substageName,
      stageName: substage.stage.stageName,
      timestamp: new Date().toISOString(),
    });
  }

  async findByStage(
    stageId: number,
  ): Promise<ProductionStageLevel2ResponseDto[]> {
    const stage = await this.prismaService.productionStageLevel1.findUnique({
      where: { stageId },
    });

    if (!stage) {
      throw new NotFoundException(
        `Технологическая операция 1 уровня с ID ${stageId} не найдена`,
      );
    }

    const substages = await this.prismaService.productionStageLevel2.findMany({
      where: { stageId },
      include: {
        stage: true,
      },
      orderBy: { substageName: 'asc' },
    });

    return substages.map((substage) => ({
      substageId: substage.substageId,
      stageId: substage.stageId,
      stageName: substage.stage.stageName,
      substageName: substage.substageName,
      description: substage.description || undefined,
      allowance: Number(substage.allowance),
    }));
  }

  async linkSubstageToStage(linkDto: LinkSubstageToStageDto): Promise<void> {
    // Проверяем существование родительского этапа
    const stage = await this.prismaService.productionStageLevel1.findUnique({
      where: { stageId: linkDto.stageId },
    });

    if (!stage) {
      throw new NotFoundException(
        `Технологическая операция 1 уровня с ID ${linkDto.stageId} не найдена`,
      );
    }

    // Проверяем уникальность названия подэтапа
    const existingSubstage =
      await this.prismaService.productionStageLevel2.findFirst({
        where: {
          stageId: linkDto.stageId,
          substageName: linkDto.substageName,
        },
      });

    if (existingSubstage) {
      throw new ConflictException(
        'Подэтап с таким названием уже существует в данной технологической операции',
      );
    }

    const substage = await this.prismaService.productionStageLevel2.create({
      data: linkDto,
      include: {
        stage: true,
      },
    });

    // Отправляем событие о создании связи
    this.eventsService.emitToRoom('productionStages', 'substageLinkedToStage', {
      substageId: substage.substageId,
      stageId: linkDto.stageId,
      substageName: linkDto.substageName,
      stageName: stage.stageName,
      timestamp: new Date().toISOString(),
    });
  }

  async rebindSubstageToNewStage(
    substageId: number,
    rebindDto: RebindSubstageDto,
  ): Promise<ProductionStageLevel2ResponseDto> {
    // Проверяем существование подэтапа
    const existingSubstage =
      await this.prismaService.productionStageLevel2.findUnique({
        where: { substageId },
        include: {
          stage: true,
        },
      });

    if (!existingSubstage) {
      throw new NotFoundException(`Подэтап с ID ${substageId} не найден`);
    }

    // Проверяем существование нового родительского этапа
    const newParentStage =
      await this.prismaService.productionStageLevel1.findUnique({
        where: { stageId: rebindDto.newStageId },
      });

    if (!newParentStage) {
      throw new NotFoundException(
        `Технологическая операция 1 уровня с ID ${rebindDto.newStageId} не найдена`,
      );
    }

    // Проверяем, что новый этап отличается от текущего
    if (existingSubstage.stageId === rebindDto.newStageId) {
      throw new ConflictException(
        'Подэтап уже привязан к указанной технологической операции',
      );
    }

    // Проверяем уникальность названия подэтапа в новом родительском этапе
    const duplicateSubstage =
      await this.prismaService.productionStageLevel2.findFirst({
        where: {
          stageId: rebindDto.newStageId,
          substageName: existingSubstage.substageName,
        },
      });

    if (duplicateSubstage) {
      throw new ConflictException(
        'Подэтап с таким названием уже существует в целевой технологической операции',
      );
    }

    // Выполняем перепривязку
    const reboundSubstage =
      await this.prismaService.productionStageLevel2.update({
        where: { substageId },
        data: { stageId: rebindDto.newStageId },
        include: {
          stage: true,
        },
      });

    const substageResponse = {
      substageId: reboundSubstage.substageId,
      stageId: reboundSubstage.stageId,
      stageName: reboundSubstage.stage.stageName,
      substageName: reboundSubstage.substageName,
      description: reboundSubstage.description || undefined,
      allowance: Number(reboundSubstage.allowance),
    };

    // Отправляем событие о перепривязке подэтапа
    this.eventsService.emitToRoom('productionStages', 'stageLevel2Rebound', {
      substage: substageResponse,
      oldStageId: existingSubstage.stageId,
      oldStageName: existingSubstage.stage.stageName,
      newStageId: rebindDto.newStageId,
      newStageName: newParentStage.stageName,
      timestamp: new Date().toISOString(),
    });

    return substageResponse;
  }
}