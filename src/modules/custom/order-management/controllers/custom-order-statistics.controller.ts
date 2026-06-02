import { Controller, Get, Param, ParseIntPipe, Patch } from '@nestjs/common';
import { CustomOrderStatisticsService } from '../services/custom-order-statistics.service';

@Controller('custom-order-statistics')
export class CustomOrderStatisticsController {
  constructor(
    private readonly customOrderStatisticsService: CustomOrderStatisticsService,
  ) {}

  @Get()
  async getAllOrders() {
    return this.customOrderStatisticsService.getAllOrders();
  }

  @Get(':id')
  async getOrderById(@Param('id', ParseIntPipe) id: number) {
    return this.customOrderStatisticsService.getOrderById(id);
  }

  @Patch(':id/force-complete')
  async forceCompleteOrder(@Param('id', ParseIntPipe) id: number) {
    return this.customOrderStatisticsService.forceCompleteOrder(id);
  }
}
