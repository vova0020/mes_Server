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
} from '../../dto/material/material-group.dto';
import { SocketService } from '../../../websocket/services/socket.service';


@Injectable()
export class MaterialGroupsService {
  constructor(
    private readonly prismaService: PrismaService,
    private socketService: SocketService,
  ) { }

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
      'material:event',
      { status: 'updated' },
    );

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
      'material:event',
      { status: 'updated' },
    );


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
      'material:event',
      { status: 'updated' },
    );

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
      'material:event',
      { status: 'updated' },
    );


    // Также отправляем в комнату материалов

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
      'material:event',
      { status: 'updated' },
    );

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
