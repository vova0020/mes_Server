import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import { CustomDetailsService } from '../services/custom-details.service';

@Controller('custom-orders/:orderId/details')
export class CustomDetailsController {
  constructor(private readonly customDetailsService: CustomDetailsService) {}

  // Получение всех деталей для определенного заказа с фильтрацией по этапу
  @Get()
  async getDetailsByOrderId(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query('stageId', new ParseIntPipe({ optional: true })) stageId?: number,
  ) {
    return await this.customDetailsService.getDetailsByOrderId(
      orderId,
      stageId,
    );
  }
}
