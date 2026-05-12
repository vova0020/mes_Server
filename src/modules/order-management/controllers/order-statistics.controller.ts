import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { OrderStatisticsService } from '../services/order-statistics.service';

@Controller('order-statistics')
export class OrderStatisticsController {
  constructor(private readonly orderStatisticsService: OrderStatisticsService) {}

  @Get()
  async getAllOrders() {
    return this.orderStatisticsService.getAllOrders();
  }

  @Get(':id')
  async getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.orderStatisticsService.getOrderById(id);
  }

  @Patch(':id/force-complete')
  async forceCompleteOrder(@Param('id', ParseIntPipe) id: number) {
    return this.orderStatisticsService.forceCompleteOrder(id);
  }
}