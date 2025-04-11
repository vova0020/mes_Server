import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DetailsService } from '../services/details.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('details')
@Controller('details')
export class DetailsController {
  constructor(private readonly detailsService: DetailsService) {}

  @Get(':orderId')
  @ApiOperation({ summary: 'Получить список деталей для заказа' })
  @ApiParam({ name: 'orderId', description: 'ID заказа', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Список деталей успешно получен',
    schema: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', example: 1 },
          articleNumber: { type: 'string', example: 'A-123-45' },
          name: { type: 'string', example: 'Вал приводной' },
          material: { type: 'string', example: 'Сталь 45' },
          size: { type: 'string', example: '50x200 мм' },
          totalQuantity: { type: 'number', example: 10 },
          readyForProcessing: { type: 'number', example: 8 },
          distributed: { type: 'number', example: 8 },
          completed: { type: 'number', example: 5 },
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Заказ не найден' })
  @ApiResponse({
    status: 500,
    description: 'Ошибка сервера',
    schema: {
      type: 'object',
      properties: {
        error: { type: 'string', example: 'Сообщение об ошибке' },
        details: { type: 'string', example: 'Дополнительная информация' },
      },
    },
  })
  async getDetailsByOrderId(@Param('orderId', ParseIntPipe) orderId: number) {
    try {
      return await this.detailsService.getDetailsByOrderId(orderId);
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      throw new HttpException(
        {
          error: 'Ошибка при получении деталей',
          details: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
