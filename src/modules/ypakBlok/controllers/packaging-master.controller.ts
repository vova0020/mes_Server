import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { PackagingMasterService } from '../services/packaging-master.service';

@Controller('ypak/packaging')
export class PackagingMasterController {
  constructor(
    private readonly packagingMasterService: PackagingMasterService,
  ) {}

  // Получение списка упаковок для конкретного заказа
  @Get('order/:id')
  async getPackagingByOrderId(@Param('id') orderId: string) {
    const packagingData =
      await this.packagingMasterService.getPackagingByOrderId(Number(orderId));

    if (!packagingData || packagingData.length === 0) {
      throw new NotFoundException(
        `Упаковки для заказа с id ${orderId} не найдены`,
      );
    }

    return packagingData;
  }
}
