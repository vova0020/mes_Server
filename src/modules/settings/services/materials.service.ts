import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialResponseDto,
} from '../dto/material.dto';

@Injectable()
export class MaterialsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(
    createMaterialDto: CreateMaterialDto,
  ): Promise<MaterialResponseDto> {
    // Проверяем уникальность названия материала
    const existingMaterial = await this.prismaService.material.findFirst({
      where: { materialName: createMaterialDto.materialName },
    });

    if (existingMaterial) {
      throw new ConflictException('Материал с таким названием уже существует');
    }

    // Если указаны группы, проверяем их существование
    if (createMaterialDto.groupIds && createMaterialDto.groupIds.length > 0) {
      const existingGroups = await this.prismaService.materialGroup.findMany({
        where: { groupId: { in: createMaterialDto.groupIds } },
      });

      if (existingGroups.length !== createMaterialDto.groupIds.length) {
        throw new NotFoundException(
          'Одна или несколько указанных групп не найдены',
        );
      }
    }

    const material = await this.prismaService.material.create({
      data: {
        materialName: createMaterialDto.materialName,
        unit: createMaterialDto.unit,
      },
    });

    // Создаем связи с группами, если они указаны
    if (createMaterialDto.groupIds && createMaterialDto.groupIds.length > 0) {
      await this.prismaService.groupMaterial.createMany({
        data: createMaterialDto.groupIds.map((groupId) => ({
          groupId,
          materialId: material.materialId,
        })),
      });
    }

    return await this.findOne(material.materialId);
  }

  async findAll(): Promise<MaterialResponseDto[]> {
    const materials = await this.prismaService.material.findMany({
      include: {
        groupsMaterials: {
          include: {
            group: true,
          },
        },
      },
      orderBy: { materialName: 'asc' },
    });

    return materials.map((material) => ({
      materialId: material.materialId,
      materialName: material.materialName,
      unit: material.unit,
      groups: material.groupsMaterials.map((gm) => ({
        groupId: gm.group.groupId,
        groupName: gm.group.groupName,
      })),
    }));
  }

  async findOne(id: number): Promise<MaterialResponseDto> {
    const material = await this.prismaService.material.findUnique({
      where: { materialId: id },
      include: {
        groupsMaterials: {
          include: {
            group: true,
          },
        },
      },
    });

    if (!material) {
      throw new NotFoundException(`Материал с ID ${id} не найден`);
    }

    return {
      materialId: material.materialId,
      materialName: material.materialName,
      unit: material.unit,
      groups: material.groupsMaterials.map((gm) => ({
        groupId: gm.group.groupId,
        groupName: gm.group.groupName,
      })),
    };
  }

  async update(
    id: number,
    updateMaterialDto: UpdateMaterialDto,
  ): Promise<MaterialResponseDto> {
    const existingMaterial = await this.prismaService.material.findUnique({
      where: { materialId: id },
    });

    if (!existingMaterial) {
      throw new NotFoundException(`Материал с ID ${id} не найден`);
    }

    // Проверяем уникальност�� нового названия (если оно изменяется)
    if (
      updateMaterialDto.materialName &&
      updateMaterialDto.materialName !== existingMaterial.materialName
    ) {
      const duplicateMaterial = await this.prismaService.material.findFirst({
        where: {
          materialName: updateMaterialDto.materialName,
          materialId: { not: id },
        },
      });

      if (duplicateMaterial) {
        throw new ConflictException(
          'Материал с таким названием уже существует',
        );
      }
    }

    // Если указаны новые группы, проверяем их существование
    if (updateMaterialDto.groupIds && updateMaterialDto.groupIds.length > 0) {
      const existingGroups = await this.prismaService.materialGroup.findMany({
        where: { groupId: { in: updateMaterialDto.groupIds } },
      });

      if (existingGroups.length !== updateMaterialDto.groupIds.length) {
        throw new NotFoundException(
          'Одна или несколько указанных групп не найдены',
        );
      }
    }

    // Обновляем материал
    await this.prismaService.material.update({
      where: { materialId: id },
      data: {
        materialName: updateMaterialDto.materialName,
        unit: updateMaterialDto.unit,
      },
    });

    // Обновляем связи с группами, если они указаны
    if (updateMaterialDto.groupIds !== undefined) {
      // Удаляем все существующие связи
      await this.prismaService.groupMaterial.deleteMany({
        where: { materialId: id },
      });

      // Создаем новые связи
      if (updateMaterialDto.groupIds.length > 0) {
        await this.prismaService.groupMaterial.createMany({
          data: updateMaterialDto.groupIds.map((groupId) => ({
            groupId,
            materialId: id,
          })),
        });
      }
    }

    return await this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    const material = await this.prismaService.material.findUnique({
      where: { materialId: id },
      include: {
        _count: {
          select: { parts: true },
        },
      },
    });

    if (!material) {
      throw new NotFoundException(`Материал с ID ${id} не найден`);
    }

    // Проверяем, используется ли материал в деталях
    if (material._count.parts > 0) {
      throw new ConflictException(
        'Нельзя удалить материал, который используется в деталях производства',
      );
    }

    // Удаляем связи с группами
    await this.prismaService.groupMaterial.deleteMany({
      where: { materialId: id },
    });

    // Удаляем материал
    await this.prismaService.material.delete({
      where: { materialId: id },
    });
  }

  async findByGroup(groupId: number): Promise<MaterialResponseDto[]> {
    const group = await this.prismaService.materialGroup.findUnique({
      where: { groupId },
    });

    if (!group) {
      throw new NotFoundException(
        `Группа материалов с ID ${groupId} не найдена`,
      );
    }

    const materials = await this.prismaService.material.findMany({
      where: {
        groupsMaterials: {
          some: { groupId },
        },
      },
      include: {
        groupsMaterials: {
          include: {
            group: true,
          },
        },
      },
      orderBy: { materialName: 'asc' },
    });

    return materials.map((material) => ({
      materialId: material.materialId,
      materialName: material.materialName,
      unit: material.unit,
      groups: material.groupsMaterials.map((gm) => ({
        groupId: gm.group.groupId,
        groupName: gm.group.groupName,
      })),
    }));
  }
}
