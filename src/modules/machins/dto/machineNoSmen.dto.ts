import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';

// Перечисление для статусов станка
export enum MachineStatus {
  ACTIVE = 'ACTIVE', // Станок активен и готов к работе
  INACTIVE = 'INACTIVE', // Станок выключен или не используется
  MAINTENANCE = 'MAINTENANCE', // Станок на обслуживании или ремонте
  BROKEN = 'BROKEN', // Станок сломан
}

// DTO для получения детальной информации об объектах

export class BufferCellInfoDto {
  @ApiProperty({
    description: 'ID ячейки буфера',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Код ячейки буфера',
    example: 'A1',
  })
  code: string;

  @ApiProperty({
    description: 'ID буфера',
    example: 1,
  })
  bufferId: number;

  @ApiProperty({
    description: 'Название буфера',
    example: 'Основной буфер',
  })
  bufferName: string;
}

export class DetailInfoDto {
  @ApiProperty({
    description: 'ID детали',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Артикул детали',
    example: 'ART-123',
  })
  article: string;

  @ApiProperty({
    description: 'Название детали',
    example: 'Столешница',
  })
  name: string;

  @ApiProperty({
    description: 'Материал детали',
    example: 'Дуб',
  })
  material: string;

  @ApiProperty({
    description: 'Размер детали',
    example: '120x80x3',
  })
  size: string;

  @ApiProperty({
    description: 'Общее количество деталей',
    example: 10,
  })
  totalNumber: number;

  @ApiProperty({
    description: 'Статус завершения для этого участка',
    example: false,
  })
  isCompletedForSegment: boolean;

  @ApiProperty({
    description: 'Количество деталей, готовых к обработке на этом участке',
    example: 5,
  })
  readyForProcessing: number;

  @ApiProperty({
    description: 'Количество завершенных деталей на этом участке',
    example: 2,
  })
  completed: number;

  // Удалено поле distributed, оно больше не используется
}

export class OrderInfoDto {
  @ApiProperty({
    description: 'ID заказа',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Номер партии/прогона',
    example: 'RUN-2023-001',
  })
  runNumber: string;

  @ApiProperty({
    description: 'Название заказа',
    example: 'Комплект кухонной мебели',
  })
  name: string;

  @ApiProperty({
    description: 'Процент выполнения заказа',
    example: 45.5,
    nullable: true,
  })
  progress: number | null;
}

// Добавляем новые DTO для поддержки информации об операции и станке
export class ProcessStepInfoDto {
  @ApiProperty({
    description: 'ID этапа процесса',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Название этапа процесса',
    example: 'Резка',
  })
  name: string;

  @ApiProperty({
    description: 'Порядковый номер этапа',
    example: 1,
  })
  sequence: number;
}

export class SegmentInfoDto {
  @ApiProperty({
    description: 'ID участка',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Название участка',
    example: 'Участок резки',
  })
  name: string;
}

export class UserInfoDto {
  @ApiProperty({
    description: 'ID пользователя',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Имя пользователя',
    example: 'operator1',
  })
  username: string;

  @ApiProperty({
    description: 'Полное имя пользователя',
    example: 'Иван Иванов',
    nullable: true,
  })
  fullName: string | null;
}

export class MachineInfoDto {
  @ApiProperty({
    description: 'ID станка',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Название станка',
    example: 'Станок №1',
  })
  name: string;

  @ApiProperty({
    description: 'Статус станка',
    example: 'ACTIVE',
  })
  status: string;
}

export class OperationInfoDto {
  @ApiProperty({
    description: 'ID операции',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Статус операции',
    example: 'IN_PROGRESS',
  })
  status: string;

  @ApiProperty({
    description: 'Детальный статус выполнения',
    example: 'PARTIALLY_COMPLETED',
    nullable: true,
  })
  completionStatus: string | null;

  @ApiProperty({
    description: 'Дата начала операции',
    example: '2023-01-01T12:00:00Z',
  })
  startedAt: Date;

  @ApiProperty({
    description: 'Дата завершения операции',
    example: '2023-01-01T14:00:00Z',
    nullable: true,
  })
  completedAt: Date | null;

  @ApiProperty({
    description: 'Информация об этапе процесса',
    type: ProcessStepInfoDto,
    nullable: true,
  })
  processStep: ProcessStepInfoDto | null;

  @ApiProperty({
    description: 'Информация об операторе',
    type: UserInfoDto,
    nullable: true,
  })
  operator: UserInfoDto | null;

  @ApiProperty({
    description: 'Информация о мастере',
    type: UserInfoDto,
    nullable: true,
  })
  master: UserInfoDto | null;
}

// DTO для запросов

export class GetMachineByIdDto {
  @ApiProperty({
    description: 'ID станка',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  id: number;
}

export class UpdateMachineStatusDto {
  @ApiProperty({
    description: 'ID станка',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  machineId: number;

  @ApiProperty({
    description: 'Новый статус станка',
    example: 'ACTIVE',
    enum: MachineStatus,
  })
  @IsEnum(MachineStatus, {
    message:
      'Статус должен быть одним из: ACTIVE, INACTIVE, MAINTENANCE, BROKEN',
  })
  @IsNotEmpty()
  status: MachineStatus;
}

export class GetSegmentOrdersDto {
  @ApiProperty({
    description: 'ID производственного участка',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  segmentId: number;
}

export class GetOrderDetailsDto {
  @ApiProperty({
    description: 'ID заказа',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  orderId: number;

  @ApiProperty({
    description: 'ID производственного участка',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  segmentId: number;
}

export class GetPalletsByDetailIdDto {
  @ApiProperty({
    description: 'ID детали',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  detailId: number;

  @ApiProperty({
    description: 'ID производственного участка',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  segmentId: number;
}

// DTO для ответов

export class MachineResponseDto {
  @ApiProperty({
    description: 'ID станка',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Название станка',
    example: 'Станок A1',
  })
  name: string;

  @ApiProperty({
    description: 'Текущий статус станка',
    example: 'ACTIVE',
    enum: MachineStatus,
  })
  status: string;

  @ApiProperty({
    description: 'Рекомендуемая загрузка станка',
    example: 100,
  })
  recommendedLoad: number;

  @ApiProperty({
    description: 'Работает ли станок без сменного задания',
    example: false,
  })
  noShiftAssignment: boolean;

  @ApiProperty({
    description: 'ID производственного участка',
    example: 1,
    nullable: true,
  })
  segmentId: number | null;

  @ApiProperty({
    description: 'Название производственного участка',
    example: 'Участок резки',
    nullable: true,
  })
  segmentName: string | null;

  @ApiProperty({
    description: 'Выполненное количество операций',
    example: 50,
    required: false,
  })
  completedQuantity?: number;

  @ApiProperty({
    description: 'Процент выполнения нормы',
    example: 75,
    required: false,
  })
  completionPercentage?: number;
}

export class SegmentOrdersResponseDto {
  @ApiProperty({
    description: 'Производственные заказы для этого участка',
    type: [OrderInfoDto],
  })
  orders: OrderInfoDto[];
}

export class OrderDetailsResponseDto {
  @ApiProperty({
    description: 'Детали заказа для этого участка',
    type: [DetailInfoDto],
  })
  details: DetailInfoDto[];
}

// Информация о том, какие этапы процесса прошел поддон и какой должен проходить сейчас
export class PalletProcessingStatusDto {
  @ApiProperty({
    description: 'Является ли текущий участок первым в маршруте',
    example: false,
  })
  isFirstSegmentInRoute: boolean;

  @ApiProperty({
    description: 'Прошел ли поддон все предыдущие участки',
    example: true,
  })
  hasCompletedPreviousSegments: boolean;

  @ApiProperty({
    description: 'Информация о текущем участке',
    type: SegmentInfoDto,
  })
  currentSegment: SegmentInfoDto; // Всегда будет предоставлена (из segmentId если текущий не определен)

  @ApiProperty({
    description: 'Информация о следующем участке',
    type: SegmentInfoDto,
    nullable: true,
  })
  nextSegment: SegmentInfoDto | null;
}

// Обновляем DTO для информации о поддоне, добавляя информацию о станке и операции
export class PalletInfoDto {
  @ApiProperty({
    description: 'ID поддона',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Название/номер поддона',
    example: 'ПОД-001',
  })
  name: string;

  @ApiProperty({
    description: 'Количество деталей на этом поддоне',
    example: 5,
  })
  quantity: number;

  @ApiProperty({
    description: 'Информация о детали',
    type: DetailInfoDto,
  })
  detail: DetailInfoDto;

  @ApiProperty({
    description: 'ID текущего этапа обработки',
    example: 2,
    nullable: true,
  })
  currentStepId: number | null;

  @ApiProperty({
    description: 'Название текущего этапа обработки',
    example: 'Резка',
    nullable: true,
  })
  currentStepName: string | null;

  @ApiProperty({
    description: 'Информация о ячейке буфера',
    type: BufferCellInfoDto,
    nullable: true,
  })
  bufferCell: BufferCellInfoDto | null;

  @ApiProperty({
    description: 'Информация о станке',
    type: MachineInfoDto,
    nullable: true,
  })
  machine: MachineInfoDto | null;

  @ApiProperty({
    description: 'Информация о текущей операции',
    type: OperationInfoDto,
    nullable: true,
  })
  currentOperation: OperationInfoDto | null;

  @ApiProperty({
    description: 'Информация о прохождении участков',
    type: PalletProcessingStatusDto,
  })
  processingStatus: PalletProcessingStatusDto;
}

// Обновляем также ответ для включения total
export class PalletsResponseDto {
  @ApiProperty({
    description: 'Поддоны, связанные с деталью',
    type: [PalletInfoDto],
  })
  pallets: PalletInfoDto[];

  @ApiProperty({
    description: 'Общее количество поддонов',
    example: 5,
  })
  total: number;
}