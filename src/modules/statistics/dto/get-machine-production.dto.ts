import { IsOptional, IsDateString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO для получения данных учёта выпуска продукции по рабочим местам (станкам)
 */
export class GetMachineProductionDto {
  /**
   * Период с (ISO дата, например 2024-01-01)
   */
  @IsOptional()
  @IsDateString()
  startDate?: string;

  /**
   * Период по (ISO дата, например 2024-12-31)
   */
  @IsOptional()
  @IsDateString()
  endDate?: string;

  /**
   * ID станка (рабочего места). Если не указан — возвращаются данные по всем станкам.
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  machineId?: number;
}
