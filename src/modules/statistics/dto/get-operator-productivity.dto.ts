import { IsInt, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO для получения данных по выработке операторов.
 *
 * Фильтры (все опциональны):
 * - startDate / endDate — период (ISO дата, например 2024-01-01)
 * - operatorId — конкретный оператор (пользователь с ролью 'operator')
 * - machineId — конкретный станок (рабочее место)
 * - stageId — конкретный этап производства, к которому привязан станок
 * - search — частичное совпадение по ФИО оператора
 */
export class GetOperatorProductivityDto {
  /**
   * Период с (ISO дата, например 2024-01-01)
   */
  @IsOptional()
  @IsString()
  startDate?: string;

  /**
   * Период по (ISO дата, например 2024-12-31)
   */
  @IsOptional()
  @IsString()
  endDate?: string;

  /**
   * ID оператора (фильтр по оператору). Если не указан — данные по всем операторам.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  operatorId?: number;

  /**
   * ID станка (рабочего места). Если не указан — данные по всем станкам.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  machineId?: number;

  /**
   * ID этапа производства (к которому привязан станок). Если не указан — данные по всем этапам.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  stageId?: number;

  /**
   * Частичное совпадение по ФИО оператора (опционально)
   */
  @IsOptional()
  @IsString()
  search?: string;
}
