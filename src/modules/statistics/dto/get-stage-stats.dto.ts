import { IsInt, IsEnum, IsOptional, IsDateString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';
import { UnitOfMeasurement, DateRangeType } from './get-production-line-stats.dto';

export class GetStageStatsDto {
  @IsInt()
  @Type(() => Number)
  lineId: number;

  @IsInt()
  @Type(() => Number)
  stageId: number;

  @IsEnum(DateRangeType)
  dateRangeType: DateRangeType;

  @ValidateIf(o => o.dateRangeType === DateRangeType.CUSTOM)
  @IsDateString()
  startDate?: string;

  @ValidateIf(o => o.dateRangeType === DateRangeType.CUSTOM)
  @IsDateString()
  endDate?: string;

  @ValidateIf(o => o.dateRangeType !== DateRangeType.CUSTOM)
  @IsDateString()
  @IsOptional()
  date?: string;
}
