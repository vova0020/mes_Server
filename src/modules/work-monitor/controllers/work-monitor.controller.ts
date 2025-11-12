import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { WorkMonitorService } from '../services/work-monitor.service';
import { StreamDto, StageProgressDto, MachineWorkplaceDto } from '../dto/work-monitor.dto';

@Controller('work-monitor')
export class WorkMonitorController {
  constructor(private readonly workMonitorService: WorkMonitorService) {}

  @Get('streams')
  async getAllStreams(): Promise<StreamDto[]> {
    return this.workMonitorService.getAllStreams();
  }

  @Get('streams/:streamId/stages')
  async getStreamStages(
    @Param('streamId', ParseIntPipe) streamId: number,
  ): Promise<StageProgressDto[]> {
    return this.workMonitorService.getStreamStages(streamId);
  }

  @Get('streams/:streamId/stages/:stageId/workplaces')
  async getStageWorkplaces(
    @Param('streamId', ParseIntPipe) streamId: number,
    @Param('stageId', ParseIntPipe) stageId: number,
  ): Promise<MachineWorkplaceDto[]> {
    return this.workMonitorService.getStageWorkplaces(streamId, stageId);
  }
}