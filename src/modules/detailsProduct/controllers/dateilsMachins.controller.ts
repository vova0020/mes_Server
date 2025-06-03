import { Controller, Get, Param, ParseIntPipe, Query } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';

// import { MachineTaskResponseDto } from '../dto/machine-taskDetail.dto';
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

  // ======================= Эндпоинты для станка со сменным заданием задания =====================

  @Get(':machineId/task')
  @ApiOperation({ summary: 'Получить сменное задание для станка' })
  @ApiParam({ name: 'machineId', description: 'ID станка', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Сменное задание успешно получено',
    type: MachineTaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Станок не найден' })
  async getMachineTask(
    @Param('machineId', ParseIntPipe) machineId: number,
  ): Promise<MachineTaskResponseDto> {
    return this.taskService.getMachineTask(machineId);
  }

  // =================   Эндпоинты для станка без сменного задания  =================================
  // Поучение сменного задания для станка
  @Get('nosmen/details')
  @ApiOperation({
    summary: 'Получить все детали для конкретного заказа и участка на станке без сменного задания',
  })
  @ApiQuery({ name: 'orderId', description: 'ID заказа' })
  @ApiQuery({ name: 'segmentId', description: 'ID производственного участка' })
  @ApiResponse({
    status: 200,
    description:
      'Возвращает все детали заказа, которые требуют обработки на этом участке на станке без сменного задания',
    type: OrderDetailsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Заказ или участок не найден' })
  async getOrderDetails(
    @Query('orderId', ParseIntPipe) orderId: number,
    @Query('segmentId', ParseIntPipe) segmentId: number,
  ): Promise<OrderDetailsResponseDto> {
    console.log(
      `Получен запрос на детали для заказа с ID: ${orderId} и участка с ID: ${segmentId} на станке без сменного задания`,
    );
    const result = await this.detailsMachinNoSmenService.getOrderDetails(
      orderId,
      segmentId,
    );
    console.log(`Найдено деталей: ${result.details.length}`);
    return result;
  }
}
