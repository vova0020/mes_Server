import { ApiProperty } from '@nestjs/swagger';
import { OperationStatus } from '@prisma/client';

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

export class YpakInfoDto {
  @ApiProperty({ description: 'ID упаковки', example: 1 })
  id: number;

  @ApiProperty({ description: 'Артикул упаковки', example: 'УПАК-1234', nullable: true })
  article: string | null;

  @ApiProperty({
    description: 'Название упаковки',
    example: 'Комплект для стола ученического',
  })
  name: string;
}

export class TaskItemDto {
  @ApiProperty({ description: 'ID операции', example: 1 })
  operationId: number;

  @ApiProperty({ description: 'ID этапа обработки', example: 2 })
  processStepId: number;

  @ApiProperty({ description: 'Название этапа обработки', example: 'Упаковка' })
  processStepName: string;


  @ApiProperty({ description: 'Количество для упаковки', example: 10 })
  quantity: number;

  @ApiProperty({
    description: 'Статус операции',
    enum: OperationStatus,
    example: 'IN_PROGRESS',
    enumName: 'OperationStatus',
  })
  status: OperationStatus;

  @ApiProperty({
    description: 'Общее количество (сумма всех деталей в упаковке)',
    example: 50,
  })
  totalQuantity: number;

  @ApiProperty({
    description: 'Готово к упаковке (детали, прошедшие предыдущие этапы)',
    example: 40,
  })
  readyForPackaging: number;

  @ApiProperty({
    description: 'Упаковано (количество упакованных деталей)',
    example: 30,
  })
  packaged: number;

  @ApiProperty({ type: YpakInfoDto })
  ypak: YpakInfoDto;

  @ApiProperty({ type: OrderInfoDto })
  order: OrderInfoDto;
}

export class MachineTaskResponseDto {
  @ApiProperty({ description: 'ID станка', example: 1 })
  machineId: number;

  @ApiProperty({ description: 'Название станка', example: 'Станок упаковки' })
  machineName: string;

  @ApiProperty({ type: [TaskItemDto] })
  tasks: TaskItemDto[];
}