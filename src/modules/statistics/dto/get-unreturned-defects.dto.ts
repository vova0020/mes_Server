import { IsOptional, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO для получения данных по невозвращенным деталям из брака
 */
export class GetUnreturnedDefectsDto {
  /**
   * ID заказа (фильтр по заказу)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  orderId?: number;

  /**
   * ID упаковки (фильтр по упаковке)
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  packageId?: number;
}
