import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import {
  CreatePackageDirectoryDto,
  UpdatePackageDirectoryDto,
} from './../dto/package-directory.dto';
import { SocketService } from '../../websocket/services/socket.service';

@Injectable()
export class PackageDirectoryService {
  constructor(
    private readonly prisma: PrismaService,
    private socketService: SocketService,
  ) {}

  /**
   * Создание новой упаковки
   */
  async create(createDto: CreatePackageDirectoryDto) {
    try {
      // Проверяем, что упаковка с таким кодом не существует
      const existingPackage = await this.prisma.packageDirectory.findUnique({
        where: { packageCode: createDto.packageCode },
      });

      if (existingPackage) {
        throw new BadRequestException(
          `Упаковка с кодом ${createDto.packageCode} уже существует`,
        );
      }

      // Создаем упаковку с деталями
      const packageDirectory = await this.prisma.packageDirectory.create({
        data: {
          packageCode: createDto.packageCode,
          packageName: createDto.packageName,
        },
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
        'package_catalog:event',
        { status: 'updated' },
      );

      return packageDirectory;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Ошибка при создании упаковки');
    }
  }

  /**
   * Получение всех упаковок с отдельным полем detailsCount
   */
  async findAll() {
    // 1) Забираем все упаковки без _count
    const packages = await this.prisma.packageDirectory.findMany({
      orderBy: { packageCode: 'asc' },
    });

    // 2) Считаем количество деталей для каждой упаковки
    const packagesWithCount = await Promise.all(
      packages.map(async (pkg) => {
        const detailsCount = await this.prisma.packageDetailDirectory.count({
          where: { packageId: pkg.packageId },
        });
        return {
          ...pkg,
          detailsCount,
        };
      }),
    );

    return packagesWithCount;
  }

  /**
   * Получение упаковки по ID с отдельным полем detailsCount
   */
  async findOne(id: number) {
    // 1) Получаем сами данные упаковки
    const packageDirectory = await this.prisma.packageDirectory.findUnique({
      where: { packageId: id },
      // убрали include: { _count: … }
    });

    if (!packageDirectory) {
      throw new NotFoundException(`Упаковка с ID ${id} не найдена`);
    }

    // 2) Считаем количество связанных packageDetails
    const detailsCount = await this.prisma.packageDetailDirectory.count({
      where: { packageId: id },
    });

    // 3) Возвращаем объединённый объект
    return {
      ...packageDirectory,
      detailsCount, // здесь новое поле
    };
  }

  /**
   * Обновление упаковки
   */
  async update(id: number, updateDto: UpdatePackageDirectoryDto) {
    try {
      // Проверяем существование упаковки
      const existingPackage = await this.findOne(id);

      // Если обновляется код, проверяем уникальность
      if (
        updateDto.packageCode &&
        updateDto.packageCode !== existingPackage.packageCode
      ) {
        const packageWithSameCode =
          await this.prisma.packageDirectory.findUnique({
            where: { packageCode: updateDto.packageCode },
          });

        if (packageWithSameCode) {
          throw new BadRequestException(
            `Упаковка с кодом ${updateDto.packageCode} уже существует`,
          );
        }
      }

      // Обновляем упаковку
      const updatedPackage = await this.prisma.packageDirectory.update({
        where: { packageId: id },
        data: {
          ...(updateDto.packageCode && { packageCode: updateDto.packageCode }),
          ...(updateDto.packageName && { packageName: updateDto.packageName }),
        },
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
        'package_catalog:event',
        { status: 'updated' },
      );

      return updatedPackage;
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException('Ошибка при обновлении упаковки');
    }
  }

  /**
   * Удаление упаковки
   */
  async remove(id: number) {
    try {
      // Проверяем существование упаковки
      await this.findOne(id);

      // Удаляем упаковку (связанные записи удалятся каскадно)
      await this.prisma.packageDirectory.delete({
        where: { packageId: id },
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
        'package_catalog:event',
        { status: 'updated' },
      );

      return { message: `Упаковка с ID ${id} успешно удалена` };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Ошибка при удалении упаковки');
    }
  }
}
