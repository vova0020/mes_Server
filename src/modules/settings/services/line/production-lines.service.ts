import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import {
  CreateProductionLineDto,
  UpdateProductionLineDto,
  ProductionLineResponseDto,
  LineStageResponseDto,
  LinkStageToLineDto,
  LinkMaterialToLineDto,
  LineMaterialsUpdateDto,
  LineStagesUpdateDto,
  LineMaterialResponseDto,
} from '../../dto/line/production-line.dto';
import { SocketService } from '../../../websocket/services/socket.service';

@Injectable()
export class ProductionLinesService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly socketService: SocketService,
  ) {}

  async create(
    createLineDto: CreateProductionLineDto,
  ): Promise<ProductionLineResponseDto> {
    // Проверяем уникальность названия потока
    const existingLine = await this.prismaService.productionLine.findFirst({
      where: { lineName: createLineDto.lineName },
    });

    if (existingLine) {
      throw new ConflictException('Поток с таким названием уже существует');
    }

    // Если указаны материалы, проверяем их существование
    if (createLineDto.materialIds && createLineDto.materialIds.length > 0) {
      const existingMaterials = await this.prismaService.material.findMany({
        where: { materialId: { in: createLineDto.materialIds } },
      });

      if (existingMaterials.length !== createLineDto.materialIds.length) {
        throw new NotFoundException(
          'Один или несколько указанных материалов не найдены',
        );
      }
    }

    // Если указаны этапы, проверяем их существование
    if (createLineDto.stageIds && createLineDto.stageIds.length > 0) {
      const existingStages =
        await this.prismaService.productionStageLevel1.findMany({
          where: { stageId: { in: createLineDto.stageIds } },
        });

      if (existingStages.length !== createLineDto.stageIds.length) {
        throw new NotFoundException(
          'Один или несколько указанных этапов не найдены',
        );
      }
    }

    const line = await this.prismaService.productionLine.create({
      data: {
        lineName: createLineDto.lineName,
        lineType: createLineDto.lineType,
      },
    });

    // Создаем связи с материалами, если они указаны
    if (createLineDto.materialIds && createLineDto.materialIds.length > 0) {
      await this.prismaService.lineMaterial.createMany({
        data: createLineDto.materialIds.map((materialId) => ({
          lineId: line.lineId,
          materialId,
        })),
      });
    }

    // Создаем связи с этапами, если они указаны
    if (createLineDto.stageIds && createLineDto.stageIds.length > 0) {
      await this.prismaService.lineStage.createMany({
        data: createLineDto.stageIds.map((stageId) => ({
          lineId: line.lineId,
          stageId,
        })),
      });
    }

    const newLine = await this.findOne(line.lineId);

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:technologist',
        'room:masterypack',
        'room:director',
      ],
      'stream:event',
      { status: 'updated' },
    );

    return newLine;
  }

  async findAll(): Promise<ProductionLineResponseDto[]> {
    const lines = await this.prismaService.productionLine.findMany({
      include: {
        _count: {
          select: { linesStages: true, materials: true },
        },
      },
      orderBy: { lineName: 'asc' },
    });

    return lines.map((line) => ({
      lineId: line.lineId,
      lineName: line.lineName,
      lineType: line.lineType,
      stagesCount: line._count.linesStages,
      materialsCount: line._count.materials,
    }));
  }

  async findOne(id: number): Promise<ProductionLineResponseDto> {
    const line = await this.prismaService.productionLine.findUnique({
      where: { lineId: id },
      include: {
        linesStages: {
          include: {
            stage: true,
          },
        },
        materials: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!line) {
      throw new NotFoundException(`Поток с ID ${id} не найден`);
    }

    return {
      lineId: line.lineId,
      lineName: line.lineName,
      lineType: line.lineType,
      stagesCount: line.linesStages.length,
      materialsCount: line.materials.length,
      stages: line.linesStages.map((ls) => ({
        lineStageId: ls.lineStageId,
        lineId: ls.lineId,
        stageId: ls.stageId,
        stageName: ls.stage.stageName,
      })),
      materials: line.materials.map((lm) => ({
        materialId: lm.material.materialId,
        materialName: lm.material.materialName,
        article: lm.material.article,
        unit: lm.material.unit,
      })),
    };
  }

  async update(
    id: number,
    updateLineDto: UpdateProductionLineDto,
  ): Promise<ProductionLineResponseDto> {
    const existingLine = await this.prismaService.productionLine.findUnique({
      where: { lineId: id },
    });

    if (!existingLine) {
      throw new NotFoundException(`Поток с ID ${id} не найден`);
    }

    // Проверяем уникальность нового названия (если оно изменяется)
    if (
      updateLineDto.lineName &&
      updateLineDto.lineName !== existingLine.lineName
    ) {
      const duplicateLine = await this.prismaService.productionLine.findFirst({
        where: {
          lineName: updateLineDto.lineName,
          lineId: { not: id },
        },
      });

      if (duplicateLine) {
        throw new ConflictException('Поток с таким названием уже существует');
      }
    }

    // Если указаны новые материалы, проверяем их существование
    if (updateLineDto.materialIds && updateLineDto.materialIds.length > 0) {
      const existingMaterials = await this.prismaService.material.findMany({
        where: { materialId: { in: updateLineDto.materialIds } },
      });

      if (existingMaterials.length !== updateLineDto.materialIds.length) {
        throw new NotFoundException(
          'Один или несколько указанных материалов не найдены',
        );
      }
    }

    // Если указаны новые этапы, проверяем их существование
    if (updateLineDto.stageIds && updateLineDto.stageIds.length > 0) {
      const existingStages =
        await this.prismaService.productionStageLevel1.findMany({
          where: { stageId: { in: updateLineDto.stageIds } },
        });

      if (existingStages.length !== updateLineDto.stageIds.length) {
        throw new NotFoundException(
          'Один или несколько указанных этапов не найдены',
        );
      }
    }

    // Обновляем поток
    await this.prismaService.productionLine.update({
      where: { lineId: id },
      data: {
        lineName: updateLineDto.lineName,
        lineType: updateLineDto.lineType,
      },
    });

    // Обновляем связи с материалами, если они указаны
    if (updateLineDto.materialIds !== undefined) {
      // Удаляем все существующие связи
      await this.prismaService.lineMaterial.deleteMany({
        where: { lineId: id },
      });

      // Создаем новые связи
      if (updateLineDto.materialIds.length > 0) {
        await this.prismaService.lineMaterial.createMany({
          data: updateLineDto.materialIds.map((materialId) => ({
            lineId: id,
            materialId,
          })),
        });
      }
    }

    // Обновляем связи с этапами, если они указаны
    if (updateLineDto.stageIds !== undefined) {
      // Удаляем все существующие связи
      await this.prismaService.lineStage.deleteMany({
        where: { lineId: id },
      });

      // Создаем новые связи
      if (updateLineDto.stageIds.length > 0) {
        await this.prismaService.lineStage.createMany({
          data: updateLineDto.stageIds.map((stageId) => ({
            lineId: id,
            stageId,
          })),
        });
      }
    }

    const updatedLine = await this.findOne(id);

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:technologist',
        'room:masterypack',
        'room:director',
      ],
      'stream:event',
      { status: 'updated' },
    );

    return updatedLine;
  }

  async remove(id: number): Promise<void> {
    const line = await this.prismaService.productionLine.findUnique({
      where: { lineId: id },
    });

    if (!line) {
      throw new NotFoundException(`Поток с ID ${id} не найден`);
    }

    // Удаляем связи с материалами
    await this.prismaService.lineMaterial.deleteMany({
      where: { lineId: id },
    });

    // Удаляем связи с этапами
    await this.prismaService.lineStage.deleteMany({
      where: { lineId: id },
    });

    // Удаляем поток
    await this.prismaService.productionLine.delete({
      where: { lineId: id },
    });

    // Отправляем событие об удалении потока
  }

  async linkStageToLine(linkDto: LinkStageToLineDto): Promise<void> {
    // Проверяем существование потока
    const line = await this.prismaService.productionLine.findUnique({
      where: { lineId: linkDto.lineId },
    });

    if (!line) {
      throw new NotFoundException(`Поток с ID ${linkDto.lineId} не найден`);
    }

    // Проверяем существование этапа
    const stage = await this.prismaService.productionStageLevel1.findUnique({
      where: { stageId: linkDto.stageId },
    });

    if (!stage) {
      throw new NotFoundException(`Этап с ID ${linkDto.stageId} не найден`);
    }

    // Проверяем, не существует ли уже такая связь
    const existingLink = await this.prismaService.lineStage.findFirst({
      where: {
        lineId: linkDto.lineId,
        stageId: linkDto.stageId,
      },
    });

    if (existingLink) {
      throw new ConflictException('Этап уже привязан к этому потоку');
    }

    await this.prismaService.lineStage.create({
      data: linkDto,
    });

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:technologist',
        'room:masterypack',
        'room:director',
      ],
      'stream:event',
      { status: 'updated' },
    );
  }

  async unlinkStageFromLine(lineStageId: number): Promise<void> {
    const existingLink = await this.prismaService.lineStage.findUnique({
      where: { lineStageId },
      include: {
        line: true,
        stage: true,
      },
    });

    if (!existingLink) {
      throw new NotFoundException('Связь между потоком и этапом не найдена');
    }

    await this.prismaService.lineStage.delete({
      where: { lineStageId },
    });

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:technologist',
        'room:masterypack',
        'room:director',
      ],
      'stream:event',
      { status: 'updated' },
    );
  }

  async getStagesInLine(lineId: number): Promise<LineStageResponseDto[]> {
    const line = await this.prismaService.productionLine.findUnique({
      where: { lineId },
      include: {
        linesStages: {
          include: {
            stage: true,
          },
        },
      },
    });

    if (!line) {
      throw new NotFoundException(`Поток с ID ${lineId} не найден`);
    }

    return line.linesStages.map((ls) => ({
      lineStageId: ls.lineStageId,
      lineId: ls.lineId,
      stageId: ls.stageId,
      stageName: ls.stage.stageName,
    }));
  }

  async linkMaterialToLine(linkDto: LinkMaterialToLineDto): Promise<void> {
    // Проверяем существование потока
    const line = await this.prismaService.productionLine.findUnique({
      where: { lineId: linkDto.lineId },
    });

    if (!line) {
      throw new NotFoundException(`Поток с ID ${linkDto.lineId} не найден`);
    }

    // Проверяем существование материала
    const material = await this.prismaService.material.findUnique({
      where: { materialId: linkDto.materialId },
    });

    if (!material) {
      throw new NotFoundException(
        `Материал с ID ${linkDto.materialId} не найден`,
      );
    }

    // Проверяем, не существует ли уже такая связь
    const existingLink = await this.prismaService.lineMaterial.findFirst({
      where: {
        lineId: linkDto.lineId,
        materialId: linkDto.materialId,
      },
    });

    if (existingLink) {
      throw new ConflictException('Материал уже привязан к этому потоку');
    }

    await this.prismaService.lineMaterial.create({
      data: linkDto,
    });

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:technologist',
        'room:masterypack',
        'room:director',
      ],
      'stream:event',
      { status: 'updated' },
    );
  }

  async unlinkMaterialFromLine(linkDto: LinkMaterialToLineDto): Promise<void> {
    const existingLink = await this.prismaService.lineMaterial.findFirst({
      where: {
        lineId: linkDto.lineId,
        materialId: linkDto.materialId,
      },
    });

    if (!existingLink) {
      throw new NotFoundException(
        'Связь между потоком и материалом не найдена',
      );
    }

    // Получаем информацию о потоке и материале для события
    const line = await this.prismaService.productionLine.findUnique({
      where: { lineId: linkDto.lineId },
    });

    const material = await this.prismaService.material.findUnique({
      where: { materialId: linkDto.materialId },
    });

    await this.prismaService.lineMaterial.delete({
      where: { lineMaterialId: existingLink.lineMaterialId },
    });

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:technologist',
        'room:masterypack',
        'room:director',
      ],
      'stream:event',
      { status: 'updated' },
    );
  }

  async getMaterialsInLine(lineId: number): Promise<LineMaterialResponseDto[]> {
    const line = await this.prismaService.productionLine.findUnique({
      where: { lineId },
      include: {
        materials: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!line) {
      throw new NotFoundException(`Поток с ID ${lineId} не найден`);
    }

    return line.materials.map((lm) => ({
      materialId: lm.material.materialId,
      materialName: lm.material.materialName,
      article: lm.material.article,
      unit: lm.material.unit,
    }));
  }

  async updateLineMaterials(
    lineId: number,
    updateDto: LineMaterialsUpdateDto,
  ): Promise<LineMaterialResponseDto[]> {
    const line = await this.prismaService.productionLine.findUnique({
      where: { lineId },
    });

    if (!line) {
      throw new NotFoundException(`Поток с ID ${lineId} не найден`);
    }

    // Проверяем существование всех указанных материалов
    if (updateDto.materialIds.length > 0) {
      const existingMaterials = await this.prismaService.material.findMany({
        where: { materialId: { in: updateDto.materialIds } },
      });

      if (existingMaterials.length !== updateDto.materialIds.length) {
        throw new NotFoundException(
          'Один или несколько указанных материалов не найдены',
        );
      }
    }

    // Удаляем все существующие связи
    await this.prismaService.lineMaterial.deleteMany({
      where: { lineId },
    });

    // Создаем новые связи
    if (updateDto.materialIds.length > 0) {
      await this.prismaService.lineMaterial.createMany({
        data: updateDto.materialIds.map((materialId) => ({
          lineId,
          materialId,
        })),
      });
    }

    const updatedMaterials = await this.getMaterialsInLine(lineId);

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:technologist',
        'room:masterypack',
        'room:director',
      ],
      'stream:event',
      { status: 'updated' },
    );

    return updatedMaterials;
  }

  async updateLineStages(
    lineId: number,
    updateDto: LineStagesUpdateDto,
  ): Promise<LineStageResponseDto[]> {
    const line = await this.prismaService.productionLine.findUnique({
      where: { lineId },
    });

    if (!line) {
      throw new NotFoundException(`Поток с ID ${lineId} не найден`);
    }

    // Проверяем существование всех указанных этапов
    if (updateDto.stageIds.length > 0) {
      const existingStages =
        await this.prismaService.productionStageLevel1.findMany({
          where: { stageId: { in: updateDto.stageIds } },
        });

      if (existingStages.length !== updateDto.stageIds.length) {
        throw new NotFoundException(
          'Один или несколько указанных этапов не найдены',
        );
      }
    }

    // Получаем текущие связи
    const currentStages = await this.prismaService.lineStage.findMany({
      where: { lineId },
    });

    const currentStageIds = currentStages.map((stage) => stage.stageId);
    const newStageIds = updateDto.stageIds;

    // Находим этапы для удаления и добавления
    const stageIdsToRemove = currentStageIds.filter(
      (id) => !newStageIds.includes(id),
    );
    const stageIdsToAdd = newStageIds.filter(
      (id) => !currentStageIds.includes(id),
    );

    // Выполняем изменения в транзакции
    await this.prismaService.$transaction(async (prisma) => {
      // Удаляем ненужные связи
      if (stageIdsToRemove.length > 0) {
        await prisma.lineStage.deleteMany({
          where: {
            lineId,
            stageId: { in: stageIdsToRemove },
          },
        });
      }

      // Добавляем новые связи
      if (stageIdsToAdd.length > 0) {
        await prisma.lineStage.createMany({
          data: stageIdsToAdd.map((stageId) => ({
            lineId,
            stageId,
          })),
        });
      }
    });

    const updatedStages = await this.getStagesInLine(lineId);

    // Отправляем WebSocket уведомление о событии
    this.socketService.emitToMultipleRooms(
      [
        'room:masterceh',
        'room:machines',
        'room:machinesnosmen',
        'room:technologist',
        'room:masterypack',
        'room:director',
      ],
      'stream:event',
      { status: 'updated' },
    );

    return updatedStages;
  }
}
