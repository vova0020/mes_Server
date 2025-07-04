import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
  BadRequestException,
} from '@nestjs/common';
import { PackingAssignmentService } from '../services/packing-assignment.service';
import {
  CreatePackingAssignmentDto,
  UpdatePackingAssignmentDto,
  PackingAssignmentQueryDto,
} from '../dto/packing-assignment.dto';
import {
  PackingAssignmentResponseDto,
  PackingAssignmentListResponseDto,
} from '../dto/packing-assignment-response.dto';

@Controller('packing-assignments')
export class PackingAssignmentController {
  constructor(
    private readonly packingAssignmentService: PackingAssignmentService,
  ) {}

  // Создание нового назначения задания на станок упаковки
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createAssignment(
    @Body() dto: CreatePackingAssignmentDto,
  ): Promise<PackingAssignmentResponseDto> {
    return await this.packingAssignmentService.createAssignment(dto);
  }

  // Получение списка заданий с фильтрами и пагинацией
  @Get()
  async getAssignments(
    @Query() query: PackingAssignmentQueryDto,
  ): Promise<PackingAssignmentListResponseDto> {
    return await this.packingAssignmentService.getAssignments(query);
  }

  // Получение задания по ID
  @Get(':taskId')
  async getAssignmentById(
    @Param('taskId') taskId: string,
  ): Promise<PackingAssignmentResponseDto> {
    const taskIdNum = Number(taskId);

    if (isNaN(taskIdNum) || taskIdNum <= 0) {
      throw new BadRequestException('Некорректный ID задания');
    }

    return await this.packingAssignmentService.getAssignmentById(taskIdNum);
  }

  // Получение всех заданий для конкретного станка
  @Get('by-machine/:machineId')
  async getAssignmentsByMachine(
    @Param('machineId') machineId: string,
  ): Promise<PackingAssignmentResponseDto[]> {
    const machineIdNum = Number(machineId);

    if (isNaN(machineIdNum) || machineIdNum <= 0) {
      throw new BadRequestException('Некорректный ID станка');
    }

    return await this.packingAssignmentService.getAssignmentsByMachine(
      machineIdNum,
    );
  }

}
