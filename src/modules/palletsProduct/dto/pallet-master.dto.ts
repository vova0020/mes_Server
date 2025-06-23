import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsPositive, IsOptional, IsEnum } from 'class-validator';

export class BufferCellDto {
  id: number;
  code: string;
  bufferId: number;
  bufferName?: string;
}

export class MachineDto {
  id: number;
  name: string;
  status: string;
}

export class ProcessStepDto {
  id: number;
  name: string;
  sequence?: number;
}

export class OperationStatusDto {
  id: number;
  status: string; // Общий статус (IN_PROGRESS, COMPLETED)
  completionStatus?: string; // Статус выполнения (COMPLETED, IN_PROGRESS, PARTIALLY_COMPLETED)
  processStep?: ProcessStepDto; // Информация о текущем шаге процесса
  startedAt: Date;
  completedAt?: Date;
}

export class PalletDto {
  id: number;
  name: string;
  quantity: number;
  detailId: number;

  // Информация о ячейке буфера (если есть)
  bufferCell?: BufferCellDto | null;

  // Информация о станке (если есть)
  machine?: MachineDto | null;

  // Информация о текущей операции (если есть)
  currentOperation?: OperationStatusDto | null;
}

export class PalletsResponseDto {
  pallets: PalletDto[];
  total: number;
}

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

  @ApiProperty({ description: 'ID этапа производства', example: 1 })
  @IsNumber()
  @IsPositive()
  segmentId: number; // теперь это stageId из ProductionStageLevel1

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
    master?: {
      id: number;
      username: string;
      details?: {
        fullName: string;
      };
    };
  };
}

// Дополнительные DTO для расширенного функционала

// DTO для информации о пользователе (оператор, мастер)
export class UserInfoDto {
  @ApiProperty({ description: 'ID пользователя', example: 1 })
  id: number;

  @ApiProperty({ description: 'Логин пользователя', example: 'operator1' })
  username: string;

  @ApiProperty({ description: 'Подробная информация о пользователе' })
  details?: {
    fullName: string;
    position?: string;
    phone?: string;
  };
}

// DTO для ответа на операцию перемещения в буфер
export class MovePalletToBufferResponseDto {
  @ApiProperty({ description: 'Сообщение о результате операции' })
  message: string;

  @ApiProperty({ description: 'Информация о поддоне после перемещения' })
  pallet: {
    id: number;
    name: string;
    partId: number;
  };

  @ApiProperty({
    description: 'Информация об операции (может быть null)',
    nullable: true,
  })
  operation: {
    id: number;
    status: string;
    startedAt: Date;
    completedAt?: Date;
  } | null;
}

// DTO для получения статистики по поддонам
export class PalletStatsDto {
  @ApiProperty({ description: 'Общее количество поддонов' })
  total: number;

  @ApiProperty({ description: 'Количество поддонов в работе' })
  inProgress: number;

  @ApiProperty({ description: 'Количество завершенных поддонов' })
  completed: number;

  @ApiProperty({ description: 'Количество поддонов в буфере' })
  inBuffer: number;

  @ApiProperty({ description: 'Количество поддонов на станках' })
  onMachines: number;
}

// DTO для фильтрации поддонов
export class PalletFilterDto {
  @ApiPropertyOptional({ description: 'ID детали для фильтрации' })
  @IsOptional()
  @IsNumber()
  partId?: number;

  @ApiPropertyOptional({ description: 'ID станка для фильтрации' })
  @IsOptional()
  @IsNumber()
  machineId?: number;

  @ApiPropertyOptional({ description: 'ID буфера для фильтрации' })
  @IsOptional()
  @IsNumber()
  bufferId?: number;

  @ApiPropertyOptional({ description: 'Статус операции для фильтрации' })
  @IsOptional()
  status?: string;
}

// DTO для массового обновления статусов операций
export class BulkUpdateOperationStatusDto {
  @ApiProperty({
    description: 'Массив ID операций для обновления',
    type: [Number],
    example: [1, 2, 3],
  })
  operationIds: number[];

  @ApiProperty({
    description: 'Новый статус для всех операций',
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

// DTO для информации о маршруте детали
export class RouteInfoDto {
  @ApiProperty({ description: 'ID маршрута' })
  id: number;

  @ApiProperty({ description: 'Название маршрута' })
  name: string;

  @ApiProperty({ description: 'Этапы маршрута' })
  stages: {
    id: number;
    name: string;
    sequence: number;
    isCompleted: boolean;
    isCurrent: boolean;
  }[];
}

// DTO для получения подробной информации о поддоне
export class DetailedPalletDto extends PalletDto {
  @ApiProperty({ description: 'Информация о детали' })
  part: {
    id: number;
    code: string;
    name: string;
    material: string;
    size: string;
    totalQuantity: number;
    status: string;
  };

  @ApiProperty({ description: 'Информация о маршруте', nullable: true })
  route?: RouteInfoDto;

  @ApiProperty({ description: 'История операций' })
  operationHistory: {
    id: number;
    status: string;
    startedAt: Date;
    completedAt?: Date;
    stageName: string;
    machineName?: string;
    operatorName?: string;
  }[];
}
