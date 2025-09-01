import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { PackingTaskManagementService } from '../services/packing-task-management.service';
import {
  MoveTaskToMachineDto,
  UpdateTaskStatusDto,
  AssignUserToTaskDto,
  SetTaskPriorityDto,
  StartTaskDto,
  CompleteTaskDto,
} from '../dto/packing-task-management.dto';
import { PackingAssignmentResponseDto } from '../dto/packing-assignment-response.dto';

@Controller('packing-task-management')
export class PackingTaskManagementController {
  constructor(
    private readonly packingTaskManagementService: PackingTaskManagementService,
  ) {}

  // Отметить задание как взято в работу
  @Put(':taskId/start')
  @HttpCode(HttpStatus.OK)
  async markTaskAsInProgress(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: StartTaskDto,
  ): Promise<PackingAssignmentResponseDto> {
    return this.packingTaskManagementService.markTaskAsInProgress(taskId, dto);
  }

  // Отметить задание как выполнено
  @Put(':taskId/complete')
  @HttpCode(HttpStatus.OK)
  async markTaskAsCompleted(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: CompleteTaskDto,
  ): Promise<PackingAssignmentResponseDto> {
    return this.packingTaskManagementService.markTaskAsCompleted(taskId, dto);
  }

  // Удалить задание у станка
  @Delete(':taskId')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteTaskFromMachine(
    @Param('taskId', ParseIntPipe) taskId: number,
  ): Promise<void> {
    return this.packingTaskManagementService.deleteTaskFromMachine(taskId);
  }

  // Переместить задание на другой станок
  @Put(':taskId/move')
  @HttpCode(HttpStatus.OK)
  async moveTaskToMachine(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: MoveTaskToMachineDto,
  ): Promise<PackingAssignmentResponseDto> {
    return this.packingTaskManagementService.moveTaskToMachine(taskId, dto);
  }

  // Обновить статус задания
  @Put(':taskId/status')
  @HttpCode(HttpStatus.OK)
  async updateTaskStatus(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: UpdateTaskStatusDto,
  ): Promise<PackingAssignmentResponseDto> {
    return this.packingTaskManagementService.updateTaskStatus(taskId, dto);
  }

  // Назначить пользователя на задание
  @Put(':taskId/assign')
  @HttpCode(HttpStatus.OK)
  async assignUserToTask(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: AssignUserToTaskDto,
  ): Promise<PackingAssignmentResponseDto> {
    return this.packingTaskManagementService.assignUserToTask(taskId, dto);
  }

  // Получить задания по пользователю
  @Get('user/:userId')
  async getTasksByUser(
    @Param('userId', ParseIntPipe) userId: number,
  ): Promise<PackingAssignmentResponseDto[]> {
    return this.packingTaskManagementService.getTasksByUser(userId);
  }

  // Назначить приоритет заданию
  @Put(':taskId/priority')
  @HttpCode(HttpStatus.OK)
  async setTaskPriority(
    @Param('taskId', ParseIntPipe) taskId: number,
    @Body() dto: SetTaskPriorityDto,
  ): Promise<PackingAssignmentResponseDto> {
    return this.packingTaskManagementService.setTaskPriority(taskId, dto);
  }
}