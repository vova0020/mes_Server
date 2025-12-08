import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

import { OrderDetailsResponseDto } from '../dto/machineNoSmen.dto';
import { DetailsMachinNoSmenService } from '../services/detailsMachinNoSmen.service';
import { MachineTaskResponseDto } from '../dto/machine-taskDetail.dto';
import { TaskDetailService } from '../services/taskDetailMachin.service';

@ApiTags('machine-tasks')
@Controller('machines')
export class DetailsMachinsController {
  constructor(
    private readonly detailsMachinNoSmenService: DetailsMachinNoSmenService,
    private readonly taskService: TaskDetailService,
  ) {}

  // ======================= Эндпоинты для станка со сменным заданием =====================

  @Get(':machineId/task')
  @ApiOperation({ summary: 'Получить сменное задание для станка' })
  @ApiParam({ name: 'machineId', description: 'ID станка', example: 1 })
  @ApiQuery({ 
    name: 'stageId', 
    description: 'ID этапа производства (опционально, для фильтрации)', 
    example: 5,
    required: false 
  })
  @ApiResponse({
    status: 200,
    description: 'Сменное задание успешно получено',
    type: MachineTaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Станок не найден' })
  async getMachineTask(
    @Param('machineId', ParseIntPipe) machineId: number,
    @Query('stageId', ParseIntPipe) stageId?: number,
  ): Promise<MachineTaskResponseDto> {
    return this.taskService.getMachineTask(machineId, stageId);
  }

  // =================   Эндпоинты для станка без сменного задания  =================================

  @Get('nosmen/details')
  @ApiOperation({
    summary:
      'Получить все детали для конкретного заказа и производственного этапа на станке без сменного задания',
  })
  @ApiQuery({ name: 'orderId', description: 'ID заказа', example: 1 })
  @ApiQuery({
    name: 'segmentId',
    description: 'ID производственного этапа (ProductionStageLevel1)',
    example: 2,
  })
  @ApiResponse({
    status: 200,
    description:
      'Возвращает все детали заказа, которые требуют обработки на этом производственном этапе для станка без сменного задания',
    type: OrderDetailsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Заказ или производственный этап не найден',
  })
  async getOrderDetails(
    @Query('orderId', ParseIntPipe) orderId: number,
    @Query('segmentId', ParseIntPipe) segmentId: number,
  ): Promise<OrderDetailsResponseDto> {
    console.log(
      `Получен запрос на детали для заказа с ID: ${orderId} и производственного этапа с ID: ${segmentId} на станке без сменного задания`,
    );
    const result = await this.detailsMachinNoSmenService.getOrderDetails(
      orderId,
      segmentId,
    );
    console.log(`Найдено деталей: ${result.details.length}`);
    return result;
  }
}
