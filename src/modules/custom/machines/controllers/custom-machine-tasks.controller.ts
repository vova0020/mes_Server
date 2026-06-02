import { Controller, Get, Post, Query, Param, Body, ParseIntPipe } from '@nestjs/common';
import { CustomMachineTasksService } from '../services/custom-machine-tasks.service';
import { CompletePartDto } from '../dto/custom-machine-master.dto';

@Controller('custom/machines/tasks')
export class CustomMachineTasksController {
  constructor(private readonly tasksService: CustomMachineTasksService) {}

  @Get()
  async getMachineTasks(
    @Query('machineId', ParseIntPipe) machineId: number,
    @Query('stageId', ParseIntPipe) stageId: number,
  ) {
    return this.tasksService.getPendingTasks(machineId, stageId);
  }

  @Get('parts')
  async getPalletParts(
    @Query('customPalletId', ParseIntPipe) customPalletId: number,
    @Query('stageId', ParseIntPipe) stageId: number,
  ) {
    return this.tasksService.getPalletPartDetails(customPalletId, stageId);
  }

  @Post('assignments/:assignmentId/start')
  async startAssignment(@Param('assignmentId', ParseIntPipe) assignmentId: number) {
    return this.tasksService.startAssignment(assignmentId);
  }

  @Post('assignments/:assignmentId/complete')
  async completeAssignment(@Param('assignmentId', ParseIntPipe) assignmentId: number) {
    return this.tasksService.completeAssignment(assignmentId);
  }

  @Post('assignments/parts/:assignmentPartId/start')
  async startPart(@Param('assignmentPartId', ParseIntPipe) assignmentPartId: number) {
    return this.tasksService.startPart(assignmentPartId);
  }

  @Post('assignments/parts/:assignmentPartId/complete')
  async completePart(
    @Param('assignmentPartId', ParseIntPipe) assignmentPartId: number,
    @Body() dto: CompletePartDto,
  ) {
    return this.tasksService.completePart(assignmentPartId, dto.processedQuantity);
  }
}
