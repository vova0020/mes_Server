import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Query,
} from '@nestjs/common';
import {
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MachinNoSmenService } from '../services/machinNoSmen.service';
import {
  MachineResponseDto,
  OrderDetailsResponseDto,
  PalletsResponseDto,
  SegmentOrdersResponseDto,
  UpdateMachineStatusDto,
} from '../dto/machineNoSmen.dto';

@ApiTags('Станки без смен')
@Controller('machines-no-shifts')
export class MachinNoSmenController {
  constructor(private readonly machinNoSmenService: MachinNoSmenService) { }

  @Get(':id')
  @ApiOperation({ summary: 'Получить информацию о станке по ID' })
  @ApiParam({ name: 'id', description: 'ID станка' })
  @ApiResponse({
    status: 200,
    description: 'Возвращает информацию о станке и его статусе',
    type: MachineResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Станок не найден' })
  async getMachineById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MachineResponseDto> {
    console.log(`Получен запрос на информацию о станке с ID: ${id}`);
    const result = await this.machinNoSmenService.getMachineById(id);
    console.log(
      `Отправлена информация о станке: ${result.name}, статус: ${result.status}`,
    );
    return result;
  }

  @Patch('status')
  @ApiOperation({ summary: 'Изменить статус станка' })
  @ApiBody({ type: UpdateMachineStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Возвращает обновленную информацию о станке с новым статусом',
    type: MachineResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Станок не найден' })
  async updateMachineStatus(
    @Body() updateDto: UpdateMachineStatusDto,
  ): Promise<MachineResponseDto> {
    console.log(
      `Получен запрос на изменение статуса станка с ID ${updateDto.machineId} на ${updateDto.status}`,
    );
    const result = await this.machinNoSmenService.updateMachineStatus(
      updateDto.machineId,
      updateDto.status,
    );
    console.log(`Статус станка ${result.name} обновлен на: ${result.status}`);
    return result;
  }

  @Get('segment/orders')
  @ApiOperation({
    summary: 'Получить все заказы для конкретного производственного участка',
  })
  @ApiQuery({ name: 'segmentId', description: 'ID производственного участка' })
  @ApiResponse({
    status: 200,
    description:
      'Возвращает все заказы, которые требуют обработки на этом участке',
    type: SegmentOrdersResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Участок не найден' })
  async getSegmentOrders(
    @Query('segmentId', ParseIntPipe) segmentId: number,
  ): Promise<SegmentOrdersResponseDto> {
    console.log(`Получен запрос на заказы для участка с ID: ${segmentId}`);
    const result = await this.machinNoSmenService.getSegmentOrders(segmentId);
    console.log(`Найдено заказов: ${result.orders.length}`);
    return result;
  }

  @Get('order/details')
  @ApiOperation({
    summary: 'Получить все детали для конкретного заказа и участка',
  })
  @ApiQuery({ name: 'orderId', description: 'ID заказа' })
  @ApiQuery({ name: 'segmentId', description: 'ID производственного участка' })
  @ApiResponse({
    status: 200,
    description:
      'Возвращает все детали заказа, которые требуют обработки на этом участке',
    type: OrderDetailsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Заказ или участок не найден' })
  async getOrderDetails(
    @Query('orderId', ParseIntPipe) orderId: number,
    @Query('segmentId', ParseIntPipe) segmentId: number,
  ): Promise<OrderDetailsResponseDto> {
    console.log(
      `Получен запрос на детали для заказа с ID: ${orderId} и участка с ID: ${segmentId}`,
    );
    const result = await this.machinNoSmenService.getOrderDetails(
      orderId,
      segmentId,
    );
    console.log(`Найдено деталей: ${result.details.length}`);
    return result;
  }

  @Get('detail/pallets')
  @ApiOperation({ summary: 'Получить все поддоны для конкретной детали' })
  @ApiQuery({ name: 'detailId', description: 'ID детали' })
  @ApiQuery({ name: 'segmentId', description: 'ID производственного участка' })
  @ApiResponse({
    status: 200,
    description: 'Возвращает все поддоны, связанные с указанной деталью',
    type: PalletsResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Деталь или участок не найдены' })
  async getPalletsByDetailId(
    @Query('detailId', ParseIntPipe) detailId: number,
    @Query('segmentId', ParseIntPipe) segmentId: number,
  ): Promise<PalletsResponseDto> {
    console.log(`Получен запрос на поддоны для детали с ID: ${detailId} и участка с ID: ${segmentId}`);
    const result = await this.machinNoSmenService.getPalletsByDetailId(detailId, segmentId);
    console.log(`Найдено поддонов: ${result.pallets.length}`);
    return result;
  }

}
