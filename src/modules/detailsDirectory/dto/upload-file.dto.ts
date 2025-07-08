import { IsInt, IsOptional, Min } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadFileDto {
  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') {
      return undefined;
    }
    const num = parseInt(value, 10);
    return isNaN(num) ? value : num;
  })
  @IsInt()
  @Min(1)
  packageId?: number;
}