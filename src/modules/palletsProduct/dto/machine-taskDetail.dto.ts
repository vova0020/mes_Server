import { ApiProperty } from '@nestjs/swagger';
import { OperationStatus } from '@prisma/client';
import { IsNumber, IsOptional, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

// DTO для запроса сменного задания станка
export class MachineTaskQueryDto {
  @ApiProperty({
    description: 'ID станка для получения сменного задания',
    example: 1,
    required: true,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  machineId: number;
}
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

  @ApiProperty({ description: 'Материал детали', example: 'ДСП 16м��' })
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
    enum: OperationStatus,
    example: 'IN_PROGRESS',
    enumName: 'OperationStatus',
  })
  status: OperationStatus;

  @ApiProperty({
    description: 'Общее количество деталей, готовых к обработке на станке',
    example: 20,
  })
  readyForProcessing: number;

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

// DTO ответа с заданием для станка
export class MachineTaskMasterResponseDto {
  @ApiProperty({
    description: 'ID операции',
    example: 1,
  })
  operationId: number;

  @ApiProperty({
    description: 'Приоритет задания',
    example: 1,
    nullable: true,
  })
  @ApiProperty({
    description: 'ID заказа',
    example: 1,
  })
  orderId: number;

  @ApiProperty({
    description: 'Название заказа',
    example: 'Заказ №123',
  })
  orderName: string;

  @ApiProperty({
    description: 'Артикул детали',
    example: 'ABC-123',
  })
  detailArticle: string;

  @ApiProperty({
    description: 'Название детали',
    example: 'Фасад кухонный',
  })
  detailName: string;

  @ApiProperty({
    description: 'Материал детали',
    example: 'ДСП',
  })
  detailMaterial: string;

  @ApiProperty({
    description: 'Размер детали',
    example: '600x800',
  })
  detailSize: string;

  @ApiProperty({
    description: 'Номер поддона',
    example: 'П-123',
  })
  palletName: string;

  @ApiProperty({
    description: 'Количество деталей на поддоне',
    example: 10,
  })
  quantity: number;

  @ApiProperty({
    description: 'Статус операции',
    example: 'ON_MACHINE',
    enum: ['ON_MACHINE', 'IN_PROGRESS', 'COMPLETED', 'BUFFERED'],
  })
  status: string;
  
  @ApiProperty({
    description: 'Статус выполнения',
    example: 'COMPLETED',
    enum: ['COMPLETED', 'IN_PROGRESS', 'PARTIALLY_COMPLETED'],
    nullable: true,
  })
  completionStatus: string | null; // Изменено с string на string | null
}