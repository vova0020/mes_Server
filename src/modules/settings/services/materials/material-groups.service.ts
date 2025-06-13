import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import {
  CreateMaterialGroupDto,
  UpdateMaterialGroupDto,
  MaterialGroupResponseDto,
  LinkMaterialToGroupDto,
} from '../../dto/material-group.dto';
import { EventsService } from '../../../websocket/services/events.service';

@Injectable()
export class MaterialGroupsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async create(
    createMaterialGroupDto: CreateMaterialGroupDto,
  ): Promise<MaterialGroupResponseDto> {
    // Проверяем уникальность названия группы
    const existingGroup = await this.prismaService.materialGroup.findFirst({
      where: { groupName: createMaterialGroupDto.groupName },
    });

    if (existingGroup) {
      throw new ConflictException(
        'Группа материалов с таким названием уже существует',
      );
    }

    const group = await this.prismaService.materialGroup.create({
      data: createMaterialGroupDto,
      include: {
        _count: {
          select: { groupsMaterials: true },
        },
      },
    });

    const newGroup = {
      groupId: group.groupId,
      groupName: group.groupName,
      materialsCount: group._count.groupsMaterials,
    };

    // Отправляем событие о создании группы материалов
    this.eventsService.emitToRoom('materialGroups', 'materialGroupCreated', {
      group: newGroup,
      timestamp: new Date().toISOString(),
    });

    return newGroup;
  }

  async findAll(): Promise<MaterialGroupResponseDto[]> {
    const groups = await this.prismaService.materialGroup.findMany({
      include: {
        _count: {
          select: { groupsMaterials: true },
        },
      },
      orderBy: { groupName: 'asc' },
    });

    return groups.map((group) => ({
      groupId: group.groupId,
      groupName: group.groupName,
      materialsCount: group._count.groupsMaterials,
    }));
  }

  async findOne(id: number): Promise<MaterialGroupResponseDto> {
    const group = await this.prismaService.materialGroup.findUnique({
      where: { groupId: id },
      include: {
        groupsMaterials: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Группа материалов с ID ${id} не найдена`);
    }

    return {
      groupId: group.groupId,
      groupName: group.groupName,
      materialsCount: group.groupsMaterials.length,
    };
  }

  async update(
    id: number,
    updateMaterialGroupDto: UpdateMaterialGroupDto,
  ): Promise<MaterialGroupResponseDto> {
    const existingGroup = await this.prismaService.materialGroup.findUnique({
      where: { groupId: id },
    });

    if (!existingGroup) {
      throw new NotFoundException(`Группа материалов с ID ${id} не найдена`);
    }

    // Проверяем уникальность нового названия (если оно изменяется)
    if (
      updateMaterialGroupDto.groupName &&
      updateMaterialGroupDto.groupName !== existingGroup.groupName
    ) {
      const duplicateGroup = await this.prismaService.materialGroup.findFirst({
        where: {
          groupName: updateMaterialGroupDto.groupName,
          groupId: { not: id },
        },
      });

      if (duplicateGroup) {
        throw new ConflictException(
          'Группа материалов с таким названием уже существует',
        );
      }
    }

    const updatedGroup = await this.prismaService.materialGroup.update({
      where: { groupId: id },
      data: updateMaterialGroupDto,
      include: {
        _count: {
          select: { groupsMaterials: true },
        },
      },
    });

    const groupResponse = {
      groupId: updatedGroup.groupId,
      groupName: updatedGroup.groupName,
      materialsCount: updatedGroup._count.groupsMaterials,
    };

    // Отправляем событие об обновлении группы материалов
    this.eventsService.emitToRoom('materialGroups', 'materialGroupUpdated', {
      group: groupResponse,
      timestamp: new Date().toISOString(),
    });

    return groupResponse;
  }

  async remove(id: number): Promise<void> {
    const group = await this.prismaService.materialGroup.findUnique({
      where: { groupId: id },
      include: {
        _count: {
          select: { groupsMaterials: true },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(`Группа материалов с ID ${id} не найдена`);
    }

    // Проверяем, есть ли связанные материалы
    if (group._count.groupsMaterials > 0) {
      throw new ConflictException(
        'Нельзя удалить группу, в которой есть материалы. Сначала удалите все материалы из группы',
      );
    }

    await this.prismaService.materialGroup.delete({
      where: { groupId: id },
    });

    // Отправляем событие об удалении группы материалов
    this.eventsService.emitToRoom('materialGroups', 'materialGroupDeleted', {
      groupId: id,
      groupName: group.groupName,
      timestamp: new Date().toISOString(),
    });
  }

  async linkMaterialToGroup(linkDto: LinkMaterialToGroupDto): Promise<void> {
    // Проверяем существование группы
    const group = await this.prismaService.materialGroup.findUnique({
      where: { groupId: linkDto.groupId },
    });

    if (!group) {
      throw new NotFoundException(
        `Группа материалов с ID ${linkDto.groupId} не найдена`,
      );
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
    const existingLink = await this.prismaService.groupMaterial.findFirst({
      where: {
        groupId: linkDto.groupId,
        materialId: linkDto.materialId,
      },
    });

    if (existingLink) {
      throw new ConflictException('Материал уже привязан к этой группе');
    }

    await this.prismaService.groupMaterial.create({
      data: linkDto,
    });

    // Отправляем событие о привязке материала к группе
    this.eventsService.emitToRoom('materialGroups', 'materialLinkedToGroup', {
      groupId: linkDto.groupId,
      materialId: linkDto.materialId,
      groupName: group.groupName,
      materialName: material.materialName,
      timestamp: new Date().toISOString(),
    });

    // Также отправляем в комнату материалов
    this.eventsService.emitToRoom('materials', 'materialLinkedToGroup', {
      groupId: linkDto.groupId,
      materialId: linkDto.materialId,
      groupName: group.groupName,
      materialName: material.materialName,
      timestamp: new Date().toISOString(),
    });
  }

  async unlinkMaterialFromGroup(
    linkDto: LinkMaterialToGroupDto,
  ): Promise<void> {
    const existingLink = await this.prismaService.groupMaterial.findFirst({
      where: {
        groupId: linkDto.groupId,
        materialId: linkDto.materialId,
      },
    });

    if (!existingLink) {
      throw new NotFoundException(
        'Связь между материалом и группой не найдена',
      );
    }

    // Получаем информацию о группе и материале для события
    const group = await this.prismaService.materialGroup.findUnique({
      where: { groupId: linkDto.groupId },
    });

    const material = await this.prismaService.material.findUnique({
      where: { materialId: linkDto.materialId },
    });

    await this.prismaService.groupMaterial.delete({
      where: { groupMaterialId: existingLink.groupMaterialId },
    });

    // Отправляем событие об отвязке материала от группы
    this.eventsService.emitToRoom(
      'materialGroups',
      'materialUnlinkedFromGroup',
      {
        groupId: linkDto.groupId,
        materialId: linkDto.materialId,
        groupName: group?.groupName,
        materialName: material?.materialName,
        timestamp: new Date().toISOString(),
      },
    );

    // Также отправляем в комнату материалов
    this.eventsService.emitToRoom('materials', 'materialUnlinkedFromGroup', {
      groupId: linkDto.groupId,
      materialId: linkDto.materialId,
      groupName: group?.groupName,
      materialName: material?.materialName,
      timestamp: new Date().toISOString(),
    });
  }

  async getMaterialsInGroup(groupId: number) {
    const group = await this.prismaService.materialGroup.findUnique({
      where: { groupId },
      include: {
        groupsMaterials: {
          include: {
            material: true,
          },
        },
      },
    });

    if (!group) {
      throw new NotFoundException(
        `Группа материалов с ID ${groupId} не найдена`,
      );
    }

    return group.groupsMaterials.map((gm) => ({
      materialId: gm.material.materialId,
      materialName: gm.material.materialName,
      unit: gm.material.unit,
    }));
  }
}
