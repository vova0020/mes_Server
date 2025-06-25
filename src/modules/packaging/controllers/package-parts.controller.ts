import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PackagePartsService } from '../services/package-parts.service';
import { PackagePartsQueryDto } from '../dto/package-parts-query.dto';

@Controller('packaging/parts')
export class PackagePartsController {
  constructor(private readonly packagePartsService: PackagePartsService) {}

  // Получение всех деталей упаковки по ID упаковки
  @Get('by-package/:packageId')
  async getPartsByPackageId(
    @Param('packageId') packageId: string,
    @Query() query: PackagePartsQueryDto,
  ) {
    const packageIdNum = Number(packageId);

    if (isNaN(packageIdNum) || packageIdNum <= 0) {
      throw new BadRequestException('Некорректный ID упаковки');
    }

    try {
      return await this.packagePartsService.getPartsByPackageId(
        packageIdNum,
        query,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Ошибка при получении деталей упаковки');
    }
  }

  // Получение конкретной детали из упаковки
  @Get('by-package/:packageId/part/:partId')
  async getPartFromPackage(
    @Param('packageId') packageId: string,
    @Param('partId') partId: string,
  ) {
    const packageIdNum = Number(packageId);
    const partIdNum = Number(partId);

    if (isNaN(packageIdNum) || packageIdNum <= 0) {
      throw new BadRequestException('Некорректный ID упаковки');
    }

    if (isNaN(partIdNum) || partIdNum <= 0) {
      throw new BadRequestException('Некорректный ID детали');
    }

    try {
      return await this.packagePartsService.getPartFromPackage(
        packageIdNum,
        partIdNum,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Ошибка при получении детали');
    }
  }

  // Получение статистики по деталям упаковки
  @Get('statistics/:packageId')
  async getPackagePartsStatistics(@Param('packageId') packageId: string) {
    const packageIdNum = Number(packageId);

    if (isNaN(packageIdNum) || packageIdNum <= 0) {
      throw new BadRequestException('Некорректный ID упаковки');
    }

    try {
      return await this.packagePartsService.getPackagePartsStatistics(
        packageIdNum,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Ошибка при получении статистики');
    }
  }
}
