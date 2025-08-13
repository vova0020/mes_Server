import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductionOrdersService } from '../services/production-orders.service';
import {
  CreateProductionOrderDto,
  UpdateProductionOrderDto,
  ProductionOrderResponseDto,
  OrderStatus,
  PackageDirectoryResponseDto,
  UpdateOrderPriorityDto,
} from '../dto/production-order.dto';

@ApiTags('Заказы производства')
@Controller('production-orders')
export class ProductionOrdersController {
  constructor(
    private readonly productionOrdersService: ProductionOrdersService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Создать заказ на производство' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Заказ успешно создан',
    type: ProductionOrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Заказ с таким номером партии уже существует',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Одна или несколько указанных упаковок/деталей не найдены',
  })
  async create(
    @Body() createOrderDto: CreateProductionOrderDto,
  ): Promise<ProductionOrderResponseDto> {
    return this.productionOrdersService.create(createOrderDto);
  }

  @Get('package-directory')
  @ApiOperation({ 
    summary: 'Получить список упаковок из справочника',
    description: 'Возвращает все доступные упаковки из справочника с их деталями для создания производственных заказов'
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список упаковок из справочника',
    type: [PackageDirectoryResponseDto],
  })
  async getPackageDirectory(): Promise<PackageDirectoryResponseDto[]> {
    return this.productionOrdersService.getPackageDirectory();
  }

  @Get()
  @ApiOperation({ summary: 'Получить все заказы на производство' })
  @ApiQuery({
    name: 'status',
    required: false,
    enum: OrderStatus,
    description: 'Фильтр по статусу заказа',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список всех заказов',
    type: [ProductionOrderResponseDto],
  })
  async findAll(
    @Query('status') status?: OrderStatus,
  ): Promise<ProductionOrderResponseDto[]> {
    // TODO: Добавить фильтрацию по статусу в сервисе
    return this.productionOrdersService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить заказ по ID' })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Заказ найден',
    type: ProductionOrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Заказ не найден',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductionOrderResponseDto> {
    return this.productionOrdersService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить заказ' })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Заказ успешно обновлен',
    type: ProductionOrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Заказ не найден',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Заказ с таким номером партии уже существует',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateOrderDto: UpdateProductionOrderDto,
  ): Promise<ProductionOrderResponseDto> {
    return this.productionOrdersService.update(id, updateOrderDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Изменить статус заказа' })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Статус заказа успешно изменен',
    type: ProductionOrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Заказ не найден',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Недопустимый переход статуса',
  })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: OrderStatus,
  ): Promise<ProductionOrderResponseDto> {
    return this.productionOrdersService.updateStatus(id, status);
  }

  @Patch(':id/priority')
  @ApiOperation({ summary: 'Изменить приоритет заказа' })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Приоритет заказа успешно изменен',
    type: ProductionOrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Заказ не найден',
  })
  async updatePriority(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePriorityDto: UpdateOrderPriorityDto,
  ): Promise<ProductionOrderResponseDto> {
    return this.productionOrdersService.updatePriority(id, updatePriorityDto.priority);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить заказ' })
  @ApiParam({ name: 'id', description: 'ID заказа' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Заказ успешно удален',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Заказ не найден',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Нельзя удалить заказ, который находится в работе',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.productionOrdersService.remove(id);
  }
}