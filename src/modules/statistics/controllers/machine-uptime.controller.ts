import { Controller, Get, Query } from '@nestjs/common';
import { MachineUptimeService, MachineUptimeResponse, StageInfo } from '../services/machine-uptime.service';
import { GetMachineUptimeStatsDto } from '../dto';

@Controller('statistics/machine-uptime')
export class MachineUptimeController {
  constructor(private readonly machineUptimeService: MachineUptimeService) {}

  @Get('stages')
  async getStages(): Promise<StageInfo[]> {
    return this.machineUptimeService.getStages();
  }

  @Get()
  async getMachineUptimeStats(@Query() dto: GetMachineUptimeStatsDto): Promise<MachineUptimeResponse> {
    return this.machineUptimeService.getMachineUptimeStats(dto);
  }
}
