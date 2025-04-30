import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsPositive } from 'class-validator';

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

  @ApiProperty({ description: 'ID этапа процесса', example: 1 })
  @IsNumber()
  @IsPositive()
  processStepId: number;

  @ApiPropertyOptional({ description: 'ID оператора (опционально)', example: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  operatorId?: number;
}

// DTO для перемещения поддона в буфер
export class MovePalletToBufferDto {
  @ApiProperty({ description: 'ID операции, которую нужно приостановить', example: 1 })
  @IsNumber()
  @IsPositive()
  operationId: number;

  @ApiProperty({ description: 'ID ячейки буфера', example: 1 })
  @IsNumber()
  @IsPositive()
  bufferCellId: number;
}

// DTO для завершения операции
export class CompleteOperationDto {
  @ApiProperty({ description: 'ID операции, которую нужно завершить', example: 1 })
  @IsNumber()
  @IsPositive()
  operationId: number;
  
  @ApiPropertyOptional({ description: 'ID мастера, подтверждающего завершение (опционально)', example: 1 })
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