import { IsInt, IsEnum, IsOptional, IsDateString, ValidateIf } from 'class-validator';
import { Type } from 'class-transformer';

export enum UnitOfMeasurement {
  PIECES = 'PIECES',
  SQUARE_METERS = 'SQUARE_METERS',
}

export enum DateRangeType {
  DAY = 'DAY',
  WEEK = 'WEEK',
  MONTH = 'MONTH',
  YEAR = 'YEAR',
  CUSTOM = 'CUSTOM',
}

export class GetProductionLineStatsDto {
  @IsInt()
  @Type(() => Number)
  lineId: number;

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

  @IsEnum(UnitOfMeasurement)
  @IsOptional()
  unit?: UnitOfMeasurement = UnitOfMeasurement.PIECES;
}
