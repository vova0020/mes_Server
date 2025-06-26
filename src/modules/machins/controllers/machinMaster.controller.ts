import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  Query,
  Body,
  Delete,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MachinMasterService } from '../services/machinMaster.service';
import {
  MachineSegmentResponseDto,
  MachineSegmentQueryDto,
} from 'src/modules/machins/dto/machine-segment.dto';
import {
  MachineTaskResponseDto,
  MachineTaskQueryDto,
  MoveTaskDto,
} from 'src/modules/machins/dto/machine-task.dto';

@ApiTags('Запросы со страницы мастера')
@Controller('machins/master')
export class MachinsMasterController {
  private readonly logger = new Logger(MachinsMasterController.name);

  constructor(private readonly machinService: MachinMasterService) {}

  // Получение списка станков
  @Get('all')
  @ApiOperation({ summary: 'Получить список всех станков' })
  @ApiResponse({ status: 200, description: 'Список станков успешно получен' })
  @ApiResponse({ status: 404, description: 'Станки не найдены' })
  @ApiQuery({
    name: 'segmentId',
    required: false,
    type: Number,
    description: 'ID производственного участка для фильтрации станков',
  })
  async getMachines(@Query('segmentId') segmentId?: string) {
    this.logger.log(
      `Получен запрос на получение станков${segmentId ? ` для участка: ${segmentId}` : ''}`,
    );

    try {
      // Преобразуем segmentId в числовой тип, если параметр был передан
      const segmentIdNumber = segmentId ? parseInt(segmentId, 10) : undefined;

      const machinsAll = await this.machinService.getMachines(segmentIdNumber);

      if (!machinsAll || machinsAll.length === 0) {
        this.logger.warn('Станки не найдены');
        throw new NotFoundException('Станки не найдены');
      }

      this.logger.log(`Возвращено ${machinsAll.length} Станков`);
      return machinsAll;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Ошибка при получении станков: ${error.message}`);
      throw new InternalServerErrorException(
        'Произошла ошибка при получении станков',
      );
    }
  }

  @Get('machines')
  @ApiOperation({ summary: 'Получить все станки определенного участка' })
  @ApiResponse({
    status: 200,
    description: 'Список станков участка',
    type: [MachineSegmentResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Участок не найден',
  })
  async getMachinesBySegment(
    @Query() query: MachineSegmentQueryDto,
  ): Promise<MachineSegmentResponseDto[]> {
    this.logger.log(
      `Запрос на получение станков для участка с ID: ${query.stageId}`,
    );
    return this.machinService.getMachinesBySegmentId(query.stageId);
  }

  @Get('machine-tasks')
  @ApiOperation({ summary: 'Получить сменное задание для станка' })
  @ApiResponse({
    status: 200,
    description: 'Список заданий для станка',
    type: [MachineTaskResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Станок не найден',
  })
  async getMachineTasks(
    @Query() query: MachineTaskQueryDto,
  ): Promise<MachineTaskResponseDto[]> {
    this.logger.log(
      `Запрос на получение заданий для станка с ID: ${query.machineId}`,
    );
    return this.machinService.getMachineTasksById(query.machineId);
  }

  @Delete('task/:operationId')
  @ApiOperation({ summary: 'Удалить задание по ID' })
  @ApiResponse({
    status: 200,
    description: 'Задание успешно удалено',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Задание с ID 1 успешно удалено',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Задание не найдено',
  })
  @HttpCode(HttpStatus.OK)
  async deleteTask(
    @Param('operationId', ParseIntPipe) operationId: number,
  ): Promise<{ message: string }> {
    this.logger.log(`Запрос на удаление задания с ID: ${operationId}`);
    return this.machinService.deleteTaskById(operationId);
  }

  @Post('task/move')
  @ApiOperation({ summary: 'Переместить задание на другой станок' })
  @ApiResponse({
    status: 200,
    description: 'Задание успешно перемещено',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: 'Задание успешно перемещено на станок Станок №2',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Невозможно переместить завершенное задание',
  })
  @ApiResponse({
    status: 404,
    description: 'Задание или станок не найдены',
  })
  @HttpCode(HttpStatus.OK)
  async moveTask(
    @Body() moveTaskDto: MoveTaskDto,
  ): Promise<{ message: string }> {
    this.logger.log(
      `Запрос на перемещение задания с ID: ${moveTaskDto.operationId} на станок с ID: ${moveTaskDto.targetMachineId}`,
    );
    return this.machinService.moveTaskToMachine(moveTaskDto);
  }
}
