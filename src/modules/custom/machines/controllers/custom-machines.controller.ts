import { Controller, Post, Body } from '@nestjs/common';
import { CustomMachinesService } from '../services/custom-machines.service';
import { CreateMachineAssignmentDto } from '../dto/create-machine-assignment.dto';

@Controller('custom/machines')
export class CustomMachinesController {
  constructor(private readonly customMachinesService: CustomMachinesService) {}

  @Post('assignments')
  async createAssignment(@Body() dto: CreateMachineAssignmentDto) {
    return this.customMachinesService.createMachineAssignment(dto);
  }
}
