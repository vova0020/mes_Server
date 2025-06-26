// src/your/dto/create-your.dto.ts

import { IsOptional, IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class PackageProductQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(0)
  orderId?: number; // ID заказа для фильтрации упаковок
}
