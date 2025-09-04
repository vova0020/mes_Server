import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
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
}