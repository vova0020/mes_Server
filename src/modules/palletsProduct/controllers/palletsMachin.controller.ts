import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { PalletMachineService } from '../services/pallets-Machine.service';
import {
  StartPalletProcessingDto,
  CompletePalletProcessingDto,
  MovePalletToBufferDto,
} from '../dto/pallet.dto';
import { MachineTaskResponseDto } from '../dto/machine-taskDetail.dto';
import { TaskDetailService } from '../services/taskDetail.service';

@ApiTags('Операции с поддонами на станке')
@Controller('machins/pallets')
export class PalletMachinController {
  constructor(
    private readonly palletService: PalletMachineService,
    private readonly taskService: TaskDetailService,
  ) {}

  @ApiOperation({ summary: 'Начать обработку поддона на станке' })
  @ApiResponse({
    status: 201,
    description: 'Операция успешно создана',
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка при создании операции',
  })
  @Post('start-processing')
  async startPalletProcessing(@Body() dto: StartPalletProcessingDto) {
    try {
      return await this.palletService.startPalletProcessing(
        dto.palletId,
        dto.machineId,
        dto.operatorId,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Ошибка при начале обработки поддона',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({ summary: 'Завершить обработку поддона на станке' })
  @ApiResponse({
    status: 200,
    description: 'Операция успешно завершена',
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка при завершении операции',
  })
  @Post('complete-processing')
  async completePalletProcessing(@Body() dto: CompletePalletProcessingDto) {
    try {
      return await this.palletService.completePalletProcessing(
        dto.palletId,
        dto.machineId,
        dto.operatorId,
        dto.segmentId,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Ошибка при завершении обработки поддона',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({ summary: 'Переместить поддон в ячейку буфера' })
  @ApiResponse({
    status: 200,
    description: 'Поддон успешно перемещен в буфер',
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка при перемещении поддона в буфер',
  })
  @Post('move-to-buffer')
  async movePalletToBuffer(@Body() dto: MovePalletToBufferDto) {
    try {
      return await this.palletService.movePalletToBuffer(
        dto.palletId,
        dto.bufferCellId,
      );
    } catch (error) {
      throw new HttpException(
        error.message || 'Ошибка при перемещении поддона в буфер',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @ApiOperation({ summary: 'Получить информацию о поддоне' })
  @ApiParam({ name: 'id', description: 'ID поддона' })
  @ApiResponse({
    status: 200,
    description: 'Информация о поддоне успешно получена',
  })
  @ApiResponse({
    status: 404,
    description: 'Поддон не найден',
  })
  @Get(':id')
  async getPalletInfo(@Param('id', ParseIntPipe) id: number) {
    const pallet = await this.palletService.getPalletInfo(id);
    if (!pallet) {
      throw new HttpException('Поддон не найден', HttpStatus.NOT_FOUND);
    }
    return pallet;
  }

  @ApiOperation({
    summary:
      'Получить список поддонов, готовых к обработке на конкретном станке',
  })
  @ApiParam({ name: 'machineId', description: 'ID станка' })
  @ApiResponse({
    status: 200,
    description: 'Список поддонов успешно получен',
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка при получении списка поддонов',
  })
  @Get('for-machine/:machineId')
  async getPalletsForMachine(
    @Param('machineId', ParseIntPipe) machineId: number,
  ) {
    try {
      return await this.palletService.getPalletsForMachine(machineId);
    } catch (error) {
      throw new HttpException(
        error.message || 'Ошибка при получении списка поддонов',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

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
}
