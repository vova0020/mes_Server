import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
  Query,
  UseGuards,
  Req,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { DetailsService } from '../services/details.service';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { DetailsQueryDto } from '../dto/details-qury.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { PrismaService } from '../../../shared/prisma.service';

// Расширяем интерфейс Request для добавления свойства user
interface RequestWithUser extends Request {
  user: {
    id: number;
    [key: string]: any;
  };
}

@ApiTags('details')
@Controller('details')
export class DetailsController {
  constructor(
    private readonly detailsService: DetailsService,
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

  @Get('master/:orderId')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Получить список деталей для мастера по заказу' })
  @ApiParam({ name: 'orderId', description: 'ID заказа', type: 'number' })
  @ApiResponse({
    status: 200,
    description: 'Список деталей успешно получен для участка мастера',
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
  @ApiResponse({
    status: 404,
    description: 'Заказ не найден или пользователь не привязан к участку',
  })
  async getDetailsByOrderIdForMaster(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Req() request: RequestWithUser, // Используем расширенный тип запроса
  ) {
    try {
      // Теперь TypeScript знает, что в request.user есть свойство id
      const userId = request.user.id;
      return await this.detailsService.getDetailsByOrderIdForMaster(
        orderId,
        userId,
      );
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

  @Get(':orderId')
  @ApiOperation({
    summary: 'Получить список деталей для заказа (устаревший метод)',
  })
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
      // Примечание: этот метод оставлен для обратной совместимости
      // В идеале, клиенты должны перейти на использование /details/master/:orderId
      // или /details/:orderId/segment/:segmentId
      console.warn(
        'Используется устаревший метод получения деталей без указания участка',
      );

      // Для совместимости используем первый доступный участок
      const firstSegment = await this.prisma.productionSegment.findFirst({
        select: { id: true },
      });

      if (!firstSegment) {
        throw new NotFoundException(
          'Не найдено ни одного производственного участка',
        );
      }

      return await this.detailsService.getDetailsByOrderId(
        orderId,
        firstSegment.id,
      );
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
