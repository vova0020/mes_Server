import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsNumber, IsOptional, IsPositive } from 'class-validator';

// DTO для назначения поддона на станок
export class AssignPalletToMachineDto {
  @ApiProperty({ description: 'ID поддона', example: 1 })
  @IsNumber()
  @IsPositive()
  palletId: number;

  @ApiProperty({ description: 'ID станка', example: 1 })
  @IsNumber()
  @IsPositive()
  machineId: number;

  @ApiProperty({ description: 'ID производственного участка', example: 1 })
  @IsNumber()
  @IsPositive()
  segmentId: number; // переименовано с processStepId для отражения реальной сущности

  @ApiPropertyOptional({
    description: 'ID оператора (опционально)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  operatorId?: number;
}

// DTO для перемещения поддона в буфер
export class MovePalletToBufferDto {
  @ApiProperty({ description: 'ID поддона', example: 1 })
  @IsNumber()
  @IsPositive()
  palletId: number;

  @ApiProperty({ description: 'ID ячейки буфера', example: 1 })
  @IsNumber()
  @IsPositive()
  bufferCellId: number;
}

// Перечисление для новых статусов операций
export enum OperationCompletionStatus {
  COMPLETED = 'COMPLETED', // Готово
  IN_PROGRESS = 'IN_PROGRESS', // В работе
  PARTIALLY_COMPLETED = 'PARTIALLY_COMPLETED', // Выполнено частично
}

// DTO для обновления статуса операции
export class UpdateOperationStatusDto {
  @ApiProperty({ description: 'ID операции', example: 1 })
  @IsNumber()
  @IsPositive()
  operationId: number;

  @ApiProperty({
    description: 'Новый статус операции',
    enum: OperationCompletionStatus,
    example: OperationCompletionStatus.COMPLETED,
  })
  @IsEnum(OperationCompletionStatus)
  status: OperationCompletionStatus;

  @ApiPropertyOptional({
    description: 'ID мастера, подтверждающего обновление (опционально)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  masterId?: number;
}

// DTO для завершения операции (устаревший, используйте UpdateOperationStatusDto)
export class CompleteOperationDto {
  @ApiProperty({
    description: 'ID операции, которую нужно завершить',
    example: 1,
  })
  @IsNumber()
  @IsPositive()
  operationId: number;

  @ApiPropertyOptional({
    description: 'ID мастера, подтверждающего завершение (опционально)',
    example: 1,
  })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  masterId?: number;
}

// DTO для ответа на запрос назначения поддона
export class PalletOperationResponseDto {
  message: string;
  operation: {
    id: number;
    status: string;
    completionStatus?: string; // Добавлен новый статус завершения
    startedAt: Date;
    completedAt?: Date;
    quantity: number;
    productionPallet: {
      id: number;
      name: string;
    };
    machine?: {
      id: number;
      name: string;
      status: string;
    };
    processStep: {
      id: number;
      name: string;
    };
    operator?: {
      id: number;
      username: string;
      details?: {
        fullName: string;
      };
    };
  };
}