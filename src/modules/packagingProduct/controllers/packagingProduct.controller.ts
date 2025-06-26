import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PackagingProductService } from '../services/packagingProduct.service';
import { PackageProductQueryDto } from '../dto/packageProduct-query.dto';

@Controller('packaging-products')
export class PackagingController {
  constructor(private readonly packagingService: PackagingProductService) {}

  // Получение упаковок с использованием query параметров (рекомендуемый способ)
  @Get()
  async getPackages(@Query() queryDto: PackageProductQueryDto) {
    if (!queryDto.orderId) {
      throw new BadRequestException('Параметр orderId обязателен');
    }

    const packages = await this.packagingService.getPackagesByOrderId(
      queryDto.orderId,
    );

    if (!packages || packages.length === 0) {
      throw new NotFoundException(
        `Упаковки для заказа с ID ${queryDto.orderId} не найдены`,
      );
    }

    return {
      packages,
    };
  }
}
