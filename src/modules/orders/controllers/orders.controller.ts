import { Controller, Get, Param, Query, NotFoundException } from '@nestjs/common';
import { OrdersService } from '../services/orders.service';
import { OrderQueryDto } from '../dto/order-query.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  // Получение списка заказов
  @Get()
  async getOrders(@Query() query: OrderQueryDto) {
    return await this.ordersService.getOrders(query);
  }

  // Получение заказа по id
  @Get(':id')
  async getOrderById(@Param('id') id: string) {
    const order = await this.ordersService.getOrderById(Number(id));
    if (!order) {
      throw new NotFoundException(`Заказ с id ${id} не найден`);
    }
    return order;
  }
}
