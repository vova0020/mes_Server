import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { SavePackagesFromFileDto } from '../dto/package-from-file.dto';
import { SocketService } from '../../websocket/services/socket.service';

@Injectable()
export class PackagesManagementService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly socketService: SocketService,
  ) {}

  async savePackages(dto: SavePackagesFromFileDto) {
    const results: {
      created: Array<{ code: string; name: string; packageId: number }>;
      updated: Array<{ code: string; name: string; packageId: number }>;
      errors: Array<{ code: string; name: string; error: string }>;
    } = {
      created: [],
      updated: [],
      errors: [],
    };

    for (const pkg of dto.packages) {
      try {
        const existing = await this.prismaService.packageDirectory.findUnique({
          where: { packageCode: pkg.code },
        });

        if (existing) {
          const updated = await this.prismaService.packageDirectory.update({
            where: { packageId: existing.packageId },
            data: { packageName: pkg.name },
          });

          results.updated.push({
            code: pkg.code,
            name: pkg.name,
            packageId: updated.packageId,
          });
        } else {
          const created = await this.prismaService.packageDirectory.create({
            data: {
              packageCode: pkg.code,
              packageName: pkg.name,
            },
          });

          results.created.push({
            code: pkg.code,
            name: pkg.name,
            packageId: created.packageId,
          });
        }
      } catch (error) {
        let errorMessage = 'Неизвестная ошибка';

        if (error.code === 'P2002') {
          errorMessage = `Упаковка с кодом "${pkg.code}" уже существует в справочнике`;
        } else if (error.message) {
          errorMessage = error.message;
        }

        results.errors.push({
          code: pkg.code,
          name: pkg.name,
          error: errorMessage,
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
      'package_catalog:event',
      { status: 'updated' },
    );

    return results;
  }
}
