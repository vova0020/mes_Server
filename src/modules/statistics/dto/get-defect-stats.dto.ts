import { IsOptional, IsDateString, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO для получения статистики по отбракованным деталям
 */
export class GetDefectStatsDto {
  /**
   * Период с (дд.мм.гггг)
   */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /**
   * Период по (дд.мм.гггг)
   */
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /**
   * ID заказа (фильтр по заказу)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderId?: number;

  /**
   * ID материала (фильтр по типу материала)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  materialId?: number;

  /**
   * Цвет материала (фильтр по цвету)
   */
  @IsOptional()
  @IsString()
  color?: string;

  /**
   * ID работника (фильтр по работнику)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  workerId?: number;

  /**
   * ID этапа производства (фильтр по этапу)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stageId?: number;
}
