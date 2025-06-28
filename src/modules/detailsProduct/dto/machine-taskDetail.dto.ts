import { ApiProperty } from '@nestjs/swagger';
import { TaskStatus } from '@prisma/client';

export class OrderInfoDto {
  @ApiProperty({ description: 'ID заказа', example: 1 })
  id: number;

  @ApiProperty({ description: 'Номер партии', example: 'РП-123456' })
  runNumber: string;

  @ApiProperty({
    description: 'Название заказа',
    example: 'Заказ мебели для школы №5',
  })
  name: string;

  @ApiProperty({
    description: 'Процент выполнения заказа',
    example: 65.5,
    nullable: true,
  })
  progress: number | null;
}

export class DetailInfoDto {
  @ApiProperty({ description: 'ID детали', example: 1 })
  id: number;

  @ApiProperty({ description: 'Артикул детали', example: 'ДСП-1234' })
  article: string;

  @ApiProperty({
    description: 'Название детали',
    example: 'Столешница 1800x800',
  })
  name: string;

  @ApiProperty({ description: 'М��териал детали', example: 'ДСП 16мм' })
  material: string;

  @ApiProperty({ description: 'Размер детали', example: '1800x800x16' })
  size: string;

  @ApiProperty({ description: 'Общее количество деталей', example: 50 })
  totalNumber: number;
}

export class TaskItemDto {
  @ApiProperty({ description: 'ID операции', example: 1 })
  operationId: number;

  @ApiProperty({ description: 'ID этапа обработки', example: 2 })
  processStepId: number;

  @ApiProperty({ description: 'Название этапа обработки', example: 'Присадка' })
  processStepName: string;

  @ApiProperty({ description: 'Количество деталей для обработки', example: 10 })
  quantity: number;

  @ApiProperty({
    description: 'Статус операции',
    enum: TaskStatus,
    example: 'IN_PROGRESS',
    enumName: 'TaskStatus',
  })
  status: TaskStatus;

  @ApiProperty({
    description: 'Общее количество деталей, готовых к обработке на станке',
    example: 20,
  })
  readyForProcessing: number;

  @ApiProperty({
    description: 'Общее количество деталей, распределенных на станке',
    example: 15,
  })
  distributed: number;

  @ApiProperty({
    description:
      'Общее количество деталей, обработка которых завершена на станке',
    example: 10,
  })
  completed: number;

  @ApiProperty({ type: DetailInfoDto })
  detail: DetailInfoDto;

  @ApiProperty({ type: OrderInfoDto })
  order: OrderInfoDto;
}

export class MachineTaskResponseDto {
  @ApiProperty({ description: 'ID станка', example: 1 })
  machineId: number;

  @ApiProperty({ description: 'Название станка', example: 'Станок ЧПУ-1' })
  machineName: string;

  @ApiProperty({ type: [TaskItemDto] })
  tasks: TaskItemDto[];
}