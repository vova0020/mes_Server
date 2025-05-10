import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsInt, IsNotEmpty } from 'class-validator';

// Объявление интерфейсов вперед, чтобы избежать проблем с порядком определения
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
    description: 'Материал дет��ли',
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
}

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
    type: () => BufferCellInfoDto,
    nullable: true,
  })
  bufferCell: BufferCellInfoDto | null;
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

// Перечисление для статусов станка
export enum MachineStatus {
  ACTIVE = 'ACTIVE',         // Станок активен и готов к работе
  INACTIVE = 'INACTIVE',     // Станок выключен или не используется
  MAINTENANCE = 'MAINTENANCE', // Станок на обслуживании или ремонте
  BROKEN = 'BROKEN'          // Станок сломан
}

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
    message: 'Статус должен быть одним из: ACTIVE, INACTIVE, MAINTENANCE, BROKEN',
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

export class GetPalletsByDetailIdDto {
  @ApiProperty({
    description: 'ID детали',
    example: 1,
  })
  @IsInt()
  @IsNotEmpty()
  detailId: number;
}

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
}

export class SegmentOrdersResponseDto {
  @ApiProperty({
    description: 'Производственные заказы для этого участка',
    type: [OrderInfoDto],
  })
  orders: OrderInfoDto[];

  @ApiProperty({
    description: 'Детали, требующие обработки на этом участке',
    type: [DetailInfoDto],
  })
  details: DetailInfoDto[];
}

export class PalletsResponseDto {
  @ApiProperty({
    description: 'Поддоны, связанные с деталью',
    type: [PalletInfoDto],
  })
  pallets: PalletInfoDto[];
}