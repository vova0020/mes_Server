import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { TaskDetailService } from '../services/taskDetail.service';
import { MachineTaskResponseDto } from '../dto/machine-taskDetail.dto';

@ApiTags('machine-tasks')
@Controller('ypak/machines')
export class TaskDetailController {
  constructor(private readonly taskService: TaskDetailService) {}

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