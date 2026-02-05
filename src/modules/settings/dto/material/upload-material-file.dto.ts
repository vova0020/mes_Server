import { IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class UploadMaterialFileDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  groupId: number;
}
