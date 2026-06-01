import {
  Controller,
  Get,
  Post,
  Delete,
  Put,
  Param,
  Body,
  ParseIntPipe,
} from '@nestjs/common';
import { CustomMachineMasterService } from '../services/custom-machine-master.service';
import { CompletePartDto, ReassignMachineDto } from '../dto/custom-machine-master.dto';

@Controller('custom/machines')
export class CustomMachineMasterController {
  constructor(
    private readonly customMachineMasterService: CustomMachineMasterService,
  ) {}

  @Get(':machineId/assignments')
  async getMachineAssignments(@Param('machineId', ParseIntPipe) machineId: number) {
    return this.customMachineMasterService.getMachineAssignments(machineId);
  }

  @Post('assignments/:assignmentId/start')
  async startAssignment(@Param('assignmentId', ParseIntPipe) assignmentId: number) {
    return this.customMachineMasterService.startAssignment(assignmentId);
  }

  @Post('assignments/:assignmentId/complete')
  async completeAssignment(@Param('assignmentId', ParseIntPipe) assignmentId: number) {
    return this.customMachineMasterService.completeAssignment(assignmentId);
  }

  @Delete('assignments/:assignmentId')
  async deleteAssignment(@Param('assignmentId', ParseIntPipe) assignmentId: number) {
    return this.customMachineMasterService.deleteAssignment(assignmentId);
  }

  @Post('assignments/parts/:assignmentPartId/start')
  async startPart(@Param('assignmentPartId', ParseIntPipe) assignmentPartId: number) {
    return this.customMachineMasterService.startPart(assignmentPartId);
  }

  @Post('assignments/parts/:assignmentPartId/complete')
  async completePart(
    @Param('assignmentPartId', ParseIntPipe) assignmentPartId: number,
    @Body() dto: CompletePartDto,
  ) {
    return this.customMachineMasterService.completePart(assignmentPartId, dto.processedQuantity);
  }

  @Delete('assignments/parts/:assignmentPartId')
  async deletePart(@Param('assignmentPartId', ParseIntPipe) assignmentPartId: number) {
    return this.customMachineMasterService.deletePart(assignmentPartId);
  }

  @Put('assignments/:assignmentId/reassign')
  async reassignMachine(
    @Param('assignmentId', ParseIntPipe) assignmentId: number,
    @Body() dto: ReassignMachineDto,
  ) {
    return this.customMachineMasterService.reassignMachine(assignmentId, dto.newMachineId);
  }
}
