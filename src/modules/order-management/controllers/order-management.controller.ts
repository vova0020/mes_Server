import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { OrderManagementService } from '../services/order-management.service';
import {
  UpdateOrderStatusDto,
  OrderListResponseDto,
  OrderDetailResponseDto,
  OrderStatusUpdateResponseDto,
} from '../dto/order-management.dto';

@ApiTags('Управление заказами')
@Controller('order-management')
export class OrderManagementController {
  constructor(
    private readonly orderManagementService: OrderManagementService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Получить все заказы',
    description:
      'Возвращает список всех заказов с базовой информацией: ID, номер партии, название, статус, процент выполнения, количество упаковок и деталей',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список всех заказов',
    type: [OrderListResponseDto],
  })
  async getAllOrders(): Promise<OrderListResponseDto[]> {
    return this.orderManagementService.getAllOrders();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Получить детальную информацию о заказе',
    description:
      'Возвращает полную информацию о заказе включая все упаковки и детали в них',
  })
  @ApiParam({
    name: 'id',
    description: 'ID заказа',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Детальная информация о заказе',
    type: OrderDetailResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Заказ не найден',
  })
  async getOrderDetails(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderDetailResponseDto> {
    return this.orderManagementService.getOrderDetails(id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Изменить статус заказа',
    description:
      'Позволяет изменить статус заказа, включая установку статуса "разрешить к запуску". Проверяет валидность перехода между статусами.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID заказа',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Статус заказа успешно изменен',
    type: OrderStatusUpdateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Заказ не найден',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Недопустимый переход статуса',
  })
  async updateOrderStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ): Promise<OrderStatusUpdateResponseDto> {
    return this.orderManagementService.updateOrderStatus(id, updateStatusDto);
  }

  @Patch(':id/postpone')
  @ApiOperation({
    summary: 'Отложить заказ',
    description: 'Переводит заказ в статус "отложен". Можно отложить только предварительные и утвержденные заказы.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID заказа',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Заказ успешно отложен',
    type: OrderStatusUpdateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Заказ не найден',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Нельзя отложить заказ с текущим статусом',
  })
  async postponeOrder(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<OrderStatusUpdateResponseDto> {
    return this.orderManagementService.postponeOrder(id);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Удалить заказ',
    description: 'Удаляет заказ только если детали не прошли этапы производства.',
  })
  @ApiParam({
    name: 'id',
    description: 'ID заказа',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Заказ успешно удален',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Заказ 1 успешно удален',
        },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Заказ не найден',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Нельзя удалить заказ, так как детали уже прошли этапы производства',
  })
  async deleteOrder(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<{ message: string }> {
    return this.orderManagementService.deleteOrder(id);
  }
}
