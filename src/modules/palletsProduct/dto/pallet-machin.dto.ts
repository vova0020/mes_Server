import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';

// Перечисление для статусов станка
export enum MachineStatus {
  ACTIVE = 'ACTIVE', // Станок активен и готов к работе
  INACTIVE = 'INACTIVE', // Станок выключен или не используется
  MAINTENANCE = 'MAINTENANCE', // Станок на обслуживании или ремонте
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

export class PartInfoDto {
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
    description: 'Статус детали',
    example: 'IN_PROGRESS',
  })
  status: string;

  @ApiProperty({
    description: 'Количество деталей, готовых к обработке на этом этапе',
    example: 5,
  })
  readyForProcessing: number;

  @ApiProperty({
    description: 'Количество завершенных деталей на этом этапе',
    example: 2,
  })
  completed: number;

  @ApiProperty({
    description: 'Завершена ли обработка детали на текущем этапе',
    example: false,
  })
  isCompletedForStage: boolean;
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
  batchNumber: string;

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
export class RouteStageInfoDto {
  @ApiProperty({
    description: 'ID этапа маршрута',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Название этапа про��зводства',
    example: 'Резка',
  })
  name: string;

  @ApiProperty({
    description: 'Порядковый номер этапа',
    example: 1,
  })
  sequence: number;
}

export class StageInfoDto {
  @ApiProperty({
    description: 'ID этапа производства',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Название этапа производства',
    example: 'Этап резки',
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
    description: 'Логин пользователя',
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

export class StageProgressInfoDto {
  @ApiProperty({
    description: 'ID прогресса этапа',
    example: 1,
  })
  id: number;

  @ApiProperty({
    description: 'Статус выполнения этапа',
    example: 'IN_PROGRESS',
  })
  status: string;

  @ApiProperty({
    description: 'Дата завершения этапа',
    example: '2023-01-01T14:00:00Z',
    nullable: true,
  })
  completedAt: Date | null;

  @ApiProperty({
    description: 'Информация об этапе маршрута',
    type: RouteStageInfoDto,
    nullable: true,
  })
  routeStage: RouteStageInfoDto | null;
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
    message: 'Статус должен быть одним из: ACTIVE, INACTIVE, MAINTENANCE',
  })
  @IsNotEmpty()
  status: MachineStatus;
}

export class GetStageOrdersDto {
  @ApiProperty({
    description: 'ID этапа производства',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  stageId: number;
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
    description: 'ID этапа производства',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  stageId: number;
}

export class GetPalletsByPartIdDto {
  @ApiProperty({
    description: 'ID детали',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  partId: number;

  @ApiProperty({
    description: 'ID этапа производства',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  stageId: number;
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
  noSmenTask: boolean;

  @ApiProperty({
    description: 'ID этапа производства',
    example: 1,
    nullable: true,
  })
  stageId: number | null;

  @ApiProperty({
    description: 'Название этапа производства',
    example: 'Этап резки',
    nullable: true,
  })
  stageName: string | null;
}

export class StageOrdersResponseDto {
  @ApiProperty({
    description: 'Производственные заказы для этого этапа',
    type: [OrderInfoDto],
  })
  orders: OrderInfoDto[];
}

export class OrderDetailsResponseDto {
  @ApiProperty({
    description: 'Детали заказа для этого этапа',
    type: [PartInfoDto],
  })
  parts: PartInfoDto[];
}

// Информация о том, какие этапы процесса прошел поддон и какой должен проходить сейчас
export class PalletProcessingStatusDto {
  @ApiProperty({
    description: 'Является ли текущий этап первым в маршруте',
    example: false,
  })
  isFirstStageInRoute: boolean;

  @ApiProperty({
    description: 'Прошел ли поддон все предыдущие этапы',
    example: true,
  })
  hasCompletedPreviousStages: boolean;

  @ApiProperty({
    description: 'Информация о текущем этапе',
    type: StageInfoDto,
  })
  currentStage: StageInfoDto;

  @ApiProperty({
    description: 'Информация о следующем этапе',
    type: StageInfoDto,
    nullable: true,
  })
  nextStage: StageInfoDto | null;
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
    description: 'Количество деталей на этом поддоне (берется из детали)',
    example: 5,
  })
  quantity: number;

  @ApiProperty({
    description: 'Информация о детали',
    type: PartInfoDto,
  })
  part: PartInfoDto;

  @ApiProperty({
    description: 'ID текущего этапа обработки',
    example: 2,
    nullable: true,
  })
  currentStageId: number | null;

  @ApiProperty({
    description: 'Название текущего этапа обработки',
    example: 'Резка',
    nullable: true,
  })
  currentStageName: string | null;

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
    description: 'Информация о текущем прогрессе этапа',
    type: StageProgressInfoDto,
    nullable: true,
  })
  currentStageProgress: StageProgressInfoDto | null;

  @ApiProperty({
    description: 'Информация о прохождении этапов',
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
