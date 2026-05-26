import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
} from '@nestjs/common';
import { CustomOrdersService } from '../services/custom-orders.service';
import { CustomOrderQueryDto } from '../dto/custom-order-query.dto';

@Controller('custom-orders')
export class CustomOrdersController {
  constructor(private readonly customOrdersService: CustomOrdersService) {}

  // Получение списка заказов заказного производства
  @Get()
  async getCustomOrders(@Query() query: CustomOrderQueryDto) {
    return await this.customOrdersService.getCustomOrders(query);
  }

  // Получение заказа по id
  @Get(':id')
  async getCustomOrderById(@Param('id') id: string) {
    const order = await this.customOrdersService.getCustomOrderById(
      Number(id),
    );
    if (!order) {
      throw new NotFoundException(`Заказ с id ${id} не найден`);
    }
    return order;
  }
}
