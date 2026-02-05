import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import { SaveMaterialsFromFileDto } from '../../dto/material/material-from-file.dto';
import { SocketService } from '../../../websocket/services/socket.service';

@Injectable()
export class MaterialsManagementService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly socketService: SocketService,
  ) {}

  async saveMaterials(dto: SaveMaterialsFromFileDto) {
    const group = await this.prismaService.materialGroup.findUnique({
      where: { groupId: dto.groupId },
    });

    if (!group) {
      throw new NotFoundException(`Группа материалов с ID ${dto.groupId} не найдена`);
    }

    const results: {
      created: Array<{ code: string; name: string; materialId: number }>;
      updated: Array<{ code: string; name: string; materialId: number }>;
      errors: Array<{ code: string; name: string; error: string }>;
    } = {
      created: [],
      updated: [],
      errors: [],
    };

    for (const material of dto.materials) {
      try {
        const existing = await this.prismaService.material.findFirst({
          where: { article: material.code },
        });

        if (existing) {
          const updated = await this.prismaService.material.update({
            where: { materialId: existing.materialId },
            data: { 
              materialName: material.name,
              unit: material.unit || existing.unit,
            },
          });

          const groupLink = await this.prismaService.groupMaterial.findFirst({
            where: {
              materialId: existing.materialId,
              groupId: dto.groupId,
            },
          });

          if (!groupLink) {
            await this.prismaService.groupMaterial.create({
              data: {
                materialId: existing.materialId,
                groupId: dto.groupId,
              },
            });
          }

          results.updated.push({
            code: material.code,
            name: material.name,
            materialId: updated.materialId,
          });
        } else {
          const created = await this.prismaService.material.create({
            data: {
              materialName: material.name,
              article: material.code,
              unit: material.unit || 'шт',
            },
          });

          await this.prismaService.groupMaterial.create({
            data: {
              materialId: created.materialId,
              groupId: dto.groupId,
            },
          });

          results.created.push({
            code: material.code,
            name: material.name,
            materialId: created.materialId,
          });
        }
      } catch (error) {
        results.errors.push({
          code: material.code,
          name: material.name,
          error: error.message,
        });
      }
    }

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

    return results;
  }

  async getUnits(): Promise<string[]> {
    const materials = await this.prismaService.material.findMany({
      select: { unit: true },
      distinct: ['unit'],
    });

    return materials.map(m => m.unit).filter(Boolean);
  }
}
