import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PackagingService } from '../services/packaging.service';
import { PackageQueryDto } from '../dto/package-query.dto';

@Controller('packaging')
export class PackagingController {
  constructor(private readonly packagingService: PackagingService) {}

  // Получение списка упаковок с фильтрами
  @Get()
  async getPackages(@Query() query: PackageQueryDto) {
    return await this.packagingService.getPackages(query);
  }

  // Получение упаковок по ID заказа
  @Get('by-order/:orderId')
  async getPackagesByOrderId(@Param('orderId') orderId: string) {
    const orderIdNum = Number(orderId);

    if (isNaN(orderIdNum) || orderIdNum <= 0) {
      throw new BadRequestException('Некорректный ID заказа');
    }

    const packages =
      await this.packagingService.getPackagesByOrderId(orderIdNum);

    if (!packages || packages.length === 0) {
      throw new NotFoundException(
        `Упаковки для заказа с ID ${orderId} не найдены`,
      );
    }

    return {
      // orderId: orderIdNum,
      // packagesCount: packages.length,
      packages,
    };
  }

  // Получение упаковки по ID
  @Get(':id')
  async getPackageById(@Param('id') id: string) {
    const packageId = Number(id);

    if (isNaN(packageId) || packageId <= 0) {
      throw new BadRequestException('Некорректный ID упаковки');
    }

    const packageData = await this.packagingService.getPackageById(packageId);

    if (!packageData) {
      throw new NotFoundException(`Упаковка с ID ${id} не найдена`);
    }

    return packageData;
  }
}
