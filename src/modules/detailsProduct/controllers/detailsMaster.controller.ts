import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { DetailsMasterService } from '../services/detailsMaster.service';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PrismaService } from '../../../shared/prisma.service';

@ApiTags('details/master')
@Controller('details/master')
export class DetailsMasterController {
  constructor(
    private readonly detailsService: DetailsMasterService,
    private readonly prisma: PrismaService,
  ) {}

  @Get(':orderId/segment/:segmentId')
  @ApiOperation({
    summary: 'Получить список деталей для заказа по конкретному участку',
  })
  @ApiParam({ name: 'orderId', description: 'ID заказа', type: 'number' })
  @ApiParam({ name: 'segmentId', description: 'ID участка', type: 'number' })
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
  @ApiResponse({ status: 404, description: 'Заказ или участок не найден' })
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
  async getDetailsByOrderIdAndSegment(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Param('segmentId', ParseIntPipe) segmentId: number,
  ) {
    try {
      return await this.detailsService.getDetailsByOrderId(orderId, segmentId);
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
