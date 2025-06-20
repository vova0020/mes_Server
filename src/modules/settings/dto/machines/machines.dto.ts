
import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  IsNotEmpty,
  Min,
  IsInt,
  IsPositive,
  IsArray,
  ValidateNested,
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MachineStatus } from '@prisma/client';

// DTO для создания станка
export class CreateMachineDto {
  @IsString()
  @IsNotEmpty({ message: 'Название станка не может быть пустым' })
  machineName: string;

  @IsEnum(MachineStatus, { message: 'Некорректный статус станка' })
  status: MachineStatus;

  @IsNumber({}, { message: 'Рекомендуемая нагрузка должна быть числом' })
  @IsPositive({ message: 'Рекомендуемая нагрузка должна быть положительной' })
  recommendedLoad: number;

  @IsString()
  @IsNotEmpty({ message: 'Единица измерения нагрузки не может быть пустой' })
  loadUnit: string;

  @IsBoolean({ message: 'noSmenTask должно быть булевым значением' })
  noSmenTask: boolean;
}

// DTO для обновления станка
export class UpdateMachineDto {
  @IsString()
  @IsNotEmpty({ message: 'Название станка не может быть пустым' })
  @IsOptional()
  machineName?: string;

  @IsEnum(MachineStatus, { message: 'Некорректный статус станка' })
  @IsOptional()
  status?: MachineStatus;

  @IsNumber({}, { message: 'Рекомендуемая нагрузка должна быть числом' })
  @IsPositive({ message: 'Рекомендуемая нагрузка должна быть положительной' })
  @IsOptional()
  recommendedLoad?: number;

  @IsString()
  @IsNotEmpty({ message: 'Единица измерения нагрузки не может быть пустой' })
  @IsOptional()
  loadUnit?: string;

  @IsBoolean({ message: 'noSmenTask должно быть булевым значением' })
  @IsOptional()
  noSmenTask?: boolean;
}

// DTO для управления связями с этапами 1-го уровня
export class MachineStageDto {
  @IsInt({ message: 'ID этапа должен быть целым числом' })
  @IsPositive({ message: 'ID этапа должен быть положительным' })
  stageId: number;
}

// DTO для управления связями с подэтапами 2-го уровня
export class MachineSubstageDto {
  @IsInt({ message: 'ID подэтапа должен быть целым числом' })
  @IsPositive({ message: 'ID подэтапа должен быть положительным' })
  substageId: number;
}

// DTO для массового добавления связей с этапами
export class BulkMachineStagesDto {
  @IsArray({ message: 'stageIds должен быть массивом' })
  @ArrayMinSize(1, { message: 'Должен быть указан хотя бы один этап' })
  @IsInt({ each: true, message: 'Каждый ID этапа должен быть целым числом' })
  @IsPositive({
    each: true,
    message: 'Каждый ID этапа должен быть положительным',
  })
  stageIds: number[];
}

// DTO для массового добавления связей с подэтапами
export class BulkMachineSubstagesDto {
  @IsArray({ message: 'substageIds должен быть массивом' })
  @ArrayMinSize(1, { message: 'Должен быть указан хотя бы один подэтап' })
  @IsInt({ each: true, message: 'Каждый ID подэтапа должен быть целым числом' })
  @IsPositive({
    each: true,
    message: 'Каждый ID подэтапа должен быть положительным',
  })
  substageIds: number[];
}

// DTO для создания станка с этапами
export class CreateMachineWithStagesDto extends CreateMachineDto {
  @IsArray({ message: 'stageIds должен быть массивом' })
  @IsOptional()
  @IsInt({ each: true, message: 'Каждый ID этапа должен быть целым числом' })
  @IsPositive({
    each: true,
    message: 'Каждый ID этапа должен быть положительным',
  })
  stageIds?: number[];

  @IsArray({ message: 'substageIds должен быть массивом' })
  @IsOptional()
  @IsInt({ each: true, message: 'Каждый ID подэтапа должен быть целым числом' })
  @IsPositive({
    each: true,
    message: 'Каждый ID подэтапа должен быть положительным',
  })
  substageIds?: number[];
}

// Интерфейсы для ответов
export interface MachineResponse {
  machineId: number;
  machineName: string;
  status: MachineStatus;
  recommendedLoad: number;
  loadUnit: string;
  noSmenTask: boolean;
  machinesStages?: MachineStageResponse[];
  machineSubstages?: MachineSubstageResponse[];
}

export interface MachineStageResponse {
  machineStageId: number;
  machineId: number;
  stageId: number;
  stage: {
    stageId: number;
    stageName: string;
    description: string | null;
  };
}

export interface MachineSubstageResponse {
  machineSubstageId: number;
  machineId: number;
  substageId: number;
  substage: {
    substageId: number;
    substageName: string;
    description: string | null;
    stage: {
      stageId: number;
      stageName: string;
    };
  };
}

export interface MachineStagesInfoResponse {
  machine: {
    machineId: number;
    machineName: string;
  };
  stages: Array<{
    stageId: number;
    stageName: string;
    availableSubstages: Array<{
      substageId: number;
      substageName: string;
      description: string | null;
    }>;
    connectedSubstages: Array<{
      substageId: number;
      substageName: string;
      description: string | null;
    }>;
  }>;
}

export interface BulkOperationResponse {
  success: boolean;
  message: string;
  addedCount: number;
  skippedCount: number;
  errors: string[];
}

export interface AvailableStagesResponse {
  stageId: number;
  stageName: string;
  description: string | null;
  productionStagesLevel2: Array<{
    substageId: number;
    substageName: string;
    description: string | null;
  }>;
}

// Исправленный интерфейс для эндпоинта получения этапов с подэтапами для выпадающих списков
export interface StagesWithSubstagesResponse {
  stageId: number;
  stageName: string;
  description: string | null;
  createdAt: Date;
  updatedAt: Date;
  substages: Array<{
    substageId: number;
    substageName: string;
    description: string | null;
    allowance: number; // Используем number вместо Decimal
  }>;
}

// Исправленный интерфейс для отдельного подэтапа в выпадающем списке
export interface SubstageOptionResponse {
  substageId: number;
  substageName: string;
  description: string | null;
  allowance: number; // Используем number вместо Decimal
  parentStage: {
    stageId: number;
    stageName: string;
  };
}
