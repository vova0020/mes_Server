import { IsInt, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class OrderQueryDto {
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  stageId: number; // ID этапа для фильтрации (обязательный)
}
