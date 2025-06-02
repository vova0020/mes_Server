// import {
//   Controller,
//   Get,
//   Post,
//   Body,
//   Query,
//   Logger,
//   HttpCode,
//   HttpStatus,
//   Delete,
//   Param,
//   ParseIntPipe,
// } from '@nestjs/common';
// import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
// import { MachineSegmentService } from '../services/machine-segment.service';
// import {
//   MachineSegmentQueryDto,
//   MachineSegmentResponseDto,
// } from '../../machins/dto/machine-segment.dto';
// import {
//   MachineTaskQueryDto,
//   MachineTaskResponseDto,
//   UpdateTaskPriorityDto,
//   DeleteTaskDto,
//   MoveTaskDto,
// } from '../../machins/dto/machine-task.dto';

// @ApiTags('machine-segment')
// @Controller('machine-segment')
// export class MachineSegmentController {
//   private readonly logger = new Logger(MachineSegmentController.name);

//   constructor(private readonly machineSegmentService: MachineSegmentService) {}

//   @Get('machines')
//   @ApiOperation({ summary: 'Получить все станки определенного участка' })
//   @ApiResponse({
//     status: 200,
//     description: 'Список станков участка',
//     type: [MachineSegmentResponseDto],
//   })
//   @ApiResponse({
//     status: 404,
//     description: 'Участок не найден',
//   })
//   async getMachinesBySegment(
//     @Query() query: MachineSegmentQueryDto,
//   ): Promise<MachineSegmentResponseDto[]> {
//     this.logger.log(
//       `Запрос на получение станков для участка с ID: ${query.segmentId}`,
//     );
//     return this.machineSegmentService.getMachinesBySegmentId(query.segmentId);
//   }

//   @Get('machine-tasks')
//   @ApiOperation({ summary: 'Получить сменное задание для станка' })
//   @ApiResponse({
//     status: 200,
//     description: 'Список заданий для станка',
//     type: [MachineTaskResponseDto],
//   })
//   @ApiResponse({
//     status: 404,
//     description: 'Станок не найден',
//   })
//   async getMachineTasks(
//     @Query() query: MachineTaskQueryDto,
//   ): Promise<MachineTaskResponseDto[]> {
//     this.logger.log(
//       `Запрос на получение заданий для с��анка с ID: ${query.machineId}`,
//     );
//     return this.machineSegmentService.getMachineTasksById(query.machineId);
//   }

//   @Delete('task/:operationId')
//   @ApiOperation({ summary: 'Удалить задание по ID' })
//   @ApiResponse({
//     status: 200,
//     description: 'Задание успешно удалено',
//     schema: {
//       type: 'object',
//       properties: {
//         message: {
//           type: 'string',
//           example: 'Задание с ID 1 успешно удалено',
//         },
//       },
//     },
//   })
//   @ApiResponse({
//     status: 404,
//     description: 'Задание не найдено',
//   })
//   @HttpCode(HttpStatus.OK)
//   async deleteTask(
//     @Param('operationId', ParseIntPipe) operationId: number,
//   ): Promise<{ message: string }> {
//     this.logger.log(`Запрос на удаление задания с ID: ${operationId}`);
//     return this.machineSegmentService.deleteTaskById(operationId);
//   }

//   @Post('task/move')
//   @ApiOperation({ summary: 'Переместить задание на другой станок' })
//   @ApiResponse({
//     status: 200,
//     description: 'Задание успешно перемещено',
//     schema: {
//       type: 'object',
//       properties: {
//         message: {
//           type: 'string',
//           example: 'Задание успешно перемещено на станок Станок №2',
//         },
//       },
//     },
//   })
//   @ApiResponse({
//     status: 400,
//     description: 'Невозможно переместить завершенное задание',
//   })
//   @ApiResponse({
//     status: 404,
//     description: 'Задание или станок не найдены',
//   })
//   @HttpCode(HttpStatus.OK)
//   async moveTask(
//     @Body() moveTaskDto: MoveTaskDto,
//   ): Promise<{ message: string }> {
//     this.logger.log(
//       `Запрос на перемещение задания с ID: ${moveTaskDto.operationId} на станок с ID: ${moveTaskDto.targetMachineId}`,
//     );
//     return this.machineSegmentService.moveTaskToMachine(moveTaskDto);
//   }
// }