import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
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
    description: 'Возвращает список всех заказов с базовой информацией: ID, номер партии, название, статус, процент выполнения, количество упаковок и деталей'
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
    description: 'Возвращает полную информацию о заказе включая все упаковки и детали в них'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID заказа',
    example: 1
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
    summary: 'Изменить ст��тус заказа',
    description: 'Позволяет изменить статус заказа, включая установку статуса "разрешить к запуску". Проверяет валидность перехода между статусами.'
  })
  @ApiParam({ 
    name: 'id', 
    description: 'ID заказа',
    example: 1
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
}