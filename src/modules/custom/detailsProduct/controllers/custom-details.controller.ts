import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { CustomDetailsService } from '../services/custom-details.service';

@Controller('custom-orders/:orderId/details')
export class CustomDetailsController {
  constructor(private readonly customDetailsService: CustomDetailsService) {}

  // Получение всех деталей для определенного заказа
  @Get()
  async getDetailsByOrderId(@Param('orderId', ParseIntPipe) orderId: number) {
    return await this.customDetailsService.getDetailsByOrderId(orderId);
  }
}
