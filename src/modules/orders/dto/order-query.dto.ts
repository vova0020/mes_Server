import { IsOptional, IsBoolean, IsNumber, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class OrderQueryDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  active?: boolean; // если active = true, выбираем заказы, у которых completed = false

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  @Min(1)
  limit?: number = 10;

  // Можно добавить дополнительные параметры для сортировки или фильтрации по другим полям
}
