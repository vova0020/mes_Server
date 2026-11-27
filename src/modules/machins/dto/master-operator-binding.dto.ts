import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';

// ========================================
// Р—Р°РїСЂРѕСЃС‹ (Query / Body DTO)
// ========================================

/**
 * DTO РґР»СЏ РїРѕР»СѓС‡РµРЅРёСЏ СѓС‡Р°СЃС‚РєРѕРІ РјР°СЃС‚РµСЂР°
 * GET /machins/master/operator-binding/segments?masterId=1
 */
export class GetMasterSegmentsQueryDto {
  @ApiProperty({ description: 'ID РјР°СЃС‚РµСЂР° (РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ)', example: 1 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsNotEmpty()
  masterId: number;
}

/**
 * DTO РґР»СЏ РїРѕР»СѓС‡РµРЅРёСЏ СЃС‚Р°РЅРєРѕРІ СѓС‡Р°СЃС‚РєР° СЃ РёРЅС„РѕСЂРјР°С†РёРµР№ Рѕ РїСЂРёРІСЏР·Р°РЅРЅС‹С… РѕРїРµСЂР°С‚РѕСЂР°С…
 * GET /machins/master/operator-binding/machines?stageId=1
 */
export class GetSegmentMachinesQueryDto {
  @ApiProperty({ description: 'ID СѓС‡Р°СЃС‚РєР° (СЌС‚Р°РїР° 1-РіРѕ СѓСЂРѕРІРЅСЏ)', example: 1 })
  @Transform(({ value }) => parseInt(value, 10))
  @IsInt()
  @IsNotEmpty()
  stageId: number;
}

/**
 * DTO РґР»СЏ РїРѕР»СѓС‡РµРЅРёСЏ СЃРїРёСЃРєР° РѕРїРµСЂР°С‚РѕСЂРѕРІ
 * GET /machins/master/operator-binding/operators
 */
export class GetOperatorsQueryDto {
  @ApiPropertyOptional({
    description: 'ID СѓС‡Р°СЃС‚РєР° РґР»СЏ С„РёР»СЊС‚СЂР°С†РёРё (РѕРїС†РёРѕРЅР°Р»СЊРЅРѕ)',
    example: 1,
  })
  @IsOptional()
  @Transform(({ value }) => (value ? parseInt(value, 10) : undefined))
  @IsInt()
  stageId?: number;
}

/**
 * DTO РґР»СЏ РїСЂРёРІСЏР·РєРё РѕРїРµСЂР°С‚РѕСЂР° Рє СЃС‚Р°РЅРєСѓ
 * POST /machins/master/operator-binding/bind
 */
export class MasterBindOperatorDto {
  @ApiProperty({ description: 'ID РѕРїРµСЂР°С‚РѕСЂР° (РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ)', example: 5 })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  operatorId: number;

  @ApiProperty({ description: 'ID СЃС‚Р°РЅРєР°', example: 3 })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  machineId: number;

  @ApiPropertyOptional({
    description:
      'РќРѕРјРµСЂ РѕРїРµСЂР°С‚РѕСЂР° РЅР° СЃС‚Р°РЅРєРµ (РµСЃР»Рё РЅРµ СѓРєР°Р·Р°РЅ вЂ” РЅР°Р·РЅР°С‡Р°РµС‚СЃСЏ Р°РІС‚РѕРјР°С‚РёС‡РµСЃРєРё)',
    example: 1,
  })
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  @Min(1)
  operatorNumber?: number;
}

/**
 * DTO РґР»СЏ РѕС‚РІСЏР·РєРё РѕРїРµСЂР°С‚РѕСЂР° РѕС‚ СЃС‚Р°РЅРєР°
 * POST /machins/master/operator-binding/unbind
 */
export class MasterUnbindOperatorDto {
  @ApiProperty({ description: 'ID РѕРїРµСЂР°С‚РѕСЂР° (РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ)', example: 5 })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  operatorId: number;

  @ApiProperty({ description: 'ID СЃС‚Р°РЅРєР°', example: 3 })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  machineId: number;
}

/**
 * DTO РґР»СЏ РёР·РјРµРЅРµРЅРёСЏ РЅРѕРјРµСЂР° РѕРїРµСЂР°С‚РѕСЂР° РЅР° СЃС‚Р°РЅРєРµ
 * PUT /machins/master/operator-binding/change-number
 */
export class MasterChangeOperatorNumberDto {
  @ApiProperty({ description: 'ID РѕРїРµСЂР°С‚РѕСЂР° (РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ)', example: 5 })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  operatorId: number;

  @ApiProperty({ description: 'ID СЃС‚Р°РЅРєР°', example: 3 })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  machineId: number;

  @ApiProperty({ description: 'РќРѕРІС‹Р№ РЅРѕРјРµСЂ РѕРїРµСЂР°С‚РѕСЂР°', example: 1 })
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  @Min(1)
  newOperatorNumber: number;
}

// ========================================
// РћС‚РІРµС‚С‹ (Response DTO)
// ========================================

/**
 * РРЅС„РѕСЂРјР°С†РёСЏ РѕР± СѓС‡Р°СЃС‚РєРµ РјР°СЃС‚РµСЂР°
 */
export class MasterSegmentResponseDto {
  @ApiProperty({ description: 'ID СѓС‡Р°СЃС‚РєР°', example: 1 })
  stageId: number;

  @ApiProperty({ description: 'РќР°Р·РІР°РЅРёРµ СѓС‡Р°СЃС‚РєР°', example: 'Р Р°СЃРєСЂРѕР№' })
  stageName: string;
}

/**
 * РРЅС„РѕСЂРјР°С†РёСЏ Рѕ РїСЂРёРІСЏР·Р°РЅРЅРѕРј РѕРїРµСЂР°С‚РѕСЂРµ РЅР° СЃС‚Р°РЅРєРµ
 */
export class BoundOperatorInfoDto {
  @ApiProperty({ description: 'ID РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ', example: 5 })
  userId: number;

  @ApiProperty({ description: 'РќРѕРјРµСЂ РѕРїРµСЂР°С‚РѕСЂР° РЅР° СЃС‚Р°РЅРєРµ', example: 1 })
  operatorNumber: number;

  @ApiProperty({ description: 'РРјСЏ РѕРїРµСЂР°С‚РѕСЂР°', example: 'РРІР°РЅ' })
  firstName: string;

  @ApiProperty({ description: 'Р¤Р°РјРёР»РёСЏ РѕРїРµСЂР°С‚РѕСЂР°', example: 'РРІР°РЅРѕРІ' })
  lastName: string;

  @ApiPropertyOptional({ description: 'Р”РѕР»Р¶РЅРѕСЃС‚СЊ', example: 'РћРїРµСЂР°С‚РѕСЂ' })
  position?: string;

  @ApiProperty({ description: 'Р’СЂРµРјСЏ РїСЂРёРІСЏР·РєРё Рє СЃС‚Р°РЅРєСѓ' })
  boundAt: Date;
}

/**
 * РРЅС„РѕСЂРјР°С†РёСЏ Рѕ СЃС‚Р°РЅРєРµ СЃ РїСЂРёРІСЏР·Р°РЅРЅС‹РјРё РѕРїРµСЂР°С‚РѕСЂР°РјРё
 */
export class SegmentMachineWithOperatorsDto {
  @ApiProperty({ description: 'ID СЃС‚Р°РЅРєР°', example: 1 })
  machineId: number;

  @ApiProperty({ description: 'РќР°Р·РІР°РЅРёРµ СЃС‚Р°РЅРєР°', example: 'РЎС‚Р°РЅРѕРє в„–1' })
  machineName: string;

  @ApiPropertyOptional({
    description: 'РљРѕРґ СЃС‚Р°РЅРєР°',
    example: 'H431',
  })
  machineCode: string | null;

  @ApiProperty({
    description: 'РЎС‚Р°С‚СѓСЃ СЃС‚Р°РЅРєР°',
    example: 'ACTIVE',
    enum: ['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'BROKEN'],
  })
  status: string;

  @ApiProperty({
    description: 'РљРѕР»РёС‡РµСЃС‚РІРѕ РїСЂРёРІСЏР·Р°РЅРЅС‹С… РѕРїРµСЂР°С‚РѕСЂРѕРІ',
    example: 2,
  })
  operatorsCount: number;

  @ApiProperty({
    description: 'РЎРїРёСЃРѕРє РїСЂРёРІСЏР·Р°РЅРЅС‹С… РѕРїРµСЂР°С‚РѕСЂРѕРІ',
    type: [BoundOperatorInfoDto],
  })
  operators: BoundOperatorInfoDto[];
}

/**
 * РРЅС„РѕСЂРјР°С†РёСЏ РѕР± РѕРїРµСЂР°С‚РѕСЂРµ (РґР»СЏ СЃРїРёСЃРєР° РґРѕСЃС‚СѓРїРЅС‹С… РѕРїРµСЂР°С‚РѕСЂРѕРІ)
 */
export class OperatorInfoDto {
  @ApiProperty({ description: 'ID РїРѕР»СЊР·РѕРІР°С‚РµР»СЏ', example: 5 })
  userId: number;

  @ApiProperty({ description: 'РРјСЏ', example: 'РРІР°РЅ' })
  firstName: string;

  @ApiProperty({ description: 'Р¤Р°РјРёР»РёСЏ', example: 'РРІР°РЅРѕРІ' })
  lastName: string;

  @ApiPropertyOptional({ description: 'Р”РѕР»Р¶РЅРѕСЃС‚СЊ', example: 'РћРїРµСЂР°С‚РѕСЂ' })
  position?: string;

  @ApiProperty({
    description: 'РџСЂРёРІСЏР·Р°РЅ Р»Рё РѕРїРµСЂР°С‚РѕСЂ Рє РєР°РєРѕРјСѓ-Р»РёР±Рѕ СЃС‚Р°РЅРєСѓ',
    example: false,
  })
  isBound: boolean;

  @ApiPropertyOptional({
    description: 'РРЅС„РѕСЂРјР°С†РёСЏ Рѕ С‚РµРєСѓС‰РµР№ РїСЂРёРІСЏР·РєРµ (РµСЃР»Рё РїСЂРёРІСЏР·Р°РЅ)',
  })
  currentBinding?: {
    machineId: number;
    machineName: string;
    machineCode: string | null;
    operatorNumber: number;
    boundAt: Date;
  };
}

/**
 * РћС‚РІРµС‚ РЅР° РїСЂРёРІСЏР·РєСѓ РѕРїРµСЂР°С‚РѕСЂР°
 */
export class MasterBindOperatorResponseDto {
  @ApiProperty({ description: 'РЈСЃРїРµС€РЅРѕСЃС‚СЊ РѕРїРµСЂР°С†РёРё', example: true })
  success: boolean;

  @ApiProperty({
    description: 'РЎРѕРѕР±С‰РµРЅРёРµ',
    example: 'РћРїРµСЂР°С‚РѕСЂ РРІР°РЅ РРІР°РЅРѕРІ РїСЂРёРІСЏР·Р°РЅ Рє СЃС‚Р°РЅРєСѓ РЎС‚Р°РЅРѕРє в„–1 РєР°Рє РѕРїРµСЂР°С‚РѕСЂ в„–1',
  })
  message: string;

  @ApiProperty({ description: 'РРЅС„РѕСЂРјР°С†РёСЏ Рѕ РїСЂРёРІСЏР·РєРµ' })
  binding: {
    bindingId: number;
    machineId: number;
    machineName: string;
    machineCode: string | null;
    operatorNumber: number;
    boundAt: Date;
  };
}

/**
 * РћС‚РІРµС‚ РЅР° РѕС‚РІСЏР·РєСѓ РѕРїРµСЂР°С‚РѕСЂР°
 */
export class MasterUnbindOperatorResponseDto {
  @ApiProperty({ description: 'РЈСЃРїРµС€РЅРѕСЃС‚СЊ РѕРїРµСЂР°С†РёРё', example: true })
  success: boolean;

  @ApiProperty({
    description: 'РЎРѕРѕР±С‰РµРЅРёРµ',
    example: 'РћРїРµСЂР°С‚РѕСЂ РРІР°РЅ РРІР°РЅРѕРІ РѕС‚РІСЏР·Р°РЅ РѕС‚ СЃС‚Р°РЅРєР° РЎС‚Р°РЅРѕРє в„–1',
  })
  message: string;

  @ApiProperty({ description: 'Р’СЂРµРјСЏ РѕС‚РІСЏР·РєРё' })
  unboundAt: Date;
}

/**
 * РћС‚РІРµС‚ РЅР° РёР·РјРµРЅРµРЅРёРµ РЅРѕРјРµСЂР° РѕРїРµСЂР°С‚РѕСЂР°
 */
export class MasterChangeNumberResponseDto {
  @ApiProperty({ description: 'РЈСЃРїРµС€РЅРѕСЃС‚СЊ РѕРїРµСЂР°С†РёРё', example: true })
  success: boolean;

  @ApiProperty({
    description: 'РЎРѕРѕР±С‰РµРЅРёРµ',
    example: 'РќРѕРјРµСЂ РѕРїРµСЂР°С‚РѕСЂР° РёР·РјРµРЅРµРЅ СЃ 2 РЅР° 1',
  })
  message: string;

  @ApiProperty({ description: 'РЎС‚Р°СЂС‹Р№ РЅРѕРјРµСЂ', example: 2 })
  oldNumber: number;

  @ApiProperty({ description: 'РќРѕРІС‹Р№ РЅРѕРјРµСЂ', example: 1 })
  newNumber: number;
}
