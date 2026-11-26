import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { OperatorWorkMonitorService } from '../services/operator-work-monitor.service';
import { WorkMonitorOperatorDto } from '../dto/work-monitor.dto';

@ApiTags('Монитор персонала')
@Controller('operator-work-monitor')
export class OperatorWorkMonitorController {
  constructor(
    private readonly operatorWorkMonitorService: OperatorWorkMonitorService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Получить данные об операторах (монитор персонала)',
    description:
      'Возвращает список операторов с информацией об их текущей привязке к станку за текущие сутки: ФИО, статус привязки, станок, производственный этап, номер оператора и время привязки.',
  })
  @ApiResponse({
    status: 200,
    description: 'Список операторов с информацией о привязке',
  })
  async getOperatorStatus(): Promise<WorkMonitorOperatorDto[]> {
    return this.operatorWorkMonitorService.getOperatorStatus();
  }
}
