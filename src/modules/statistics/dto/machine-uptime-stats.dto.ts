import { IsInt, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';
import { DateRangeType } from './get-production-line-stats.dto';

export class GetMachineUptimeStatsDto {
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  stageId?: number;

  @IsEnum(DateRangeType)
  dateRangeType: DateRangeType;

  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
