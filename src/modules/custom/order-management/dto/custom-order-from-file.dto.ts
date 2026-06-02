import {
  IsString,
  IsNotEmpty,
  IsArray,
  ValidateNested,
  IsNumber,
  IsDateString,
  IsOptional,
  IsBoolean,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class CustomPartFromFileDto {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  partSku?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  partName: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  partCode?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  materialName?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  materialSku?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  thickness?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  thicknessWithEdging?: number;

  @ApiProperty()
  @IsNumber()
  quantity: number;

  @ApiProperty({ description: 'ID маршрута обработки', example: 1 })
  @IsNumber()
  routeId: number;

  @ApiProperty({ required: false, description: 'Выбранный маршрут (для UI)' })
  @IsOptional()
  @IsNumber()
  selectedRouteId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  blankLength?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  blankWidth?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  finishedLength?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  finishedWidth?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  groove?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  edgingSkuL1?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  edgingNameL1?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  edgingSkuL2?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  edgingNameL2?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  edgingSkuW1?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  edgingNameW1?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  edgingSkuW2?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  edgingNameW2?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  plasticFace?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  plasticFaceSku?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  plasticBack?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  plasticBackSku?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  additionalMaterial?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  pf?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  pfSku?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  sbPart?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  pfSb?: any;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  sbPartSku?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  conveyorPosition?: string;
}

export class SaveCustomOrderFromFileDto {
  @ApiProperty({
    description: 'Номер заказа',
    example: 'ORD-2024-001',
  })
  @IsString()
  @IsNotEmpty()
  orderNumber: string;

  @ApiProperty({
    description: 'Название заказа',
    example: 'Заказ на индивидуальное производство',
  })
  @IsString()
  @IsNotEmpty()
  orderName: string;

  @ApiProperty({
    description: 'Требуемая дата выполнения заказа',
    example: '2024-12-31',
  })
  @IsDateString()
  requiredDate: string;

  @ApiProperty({
    description: 'Список деталей для индивидуального производства',
    type: [CustomPartFromFileDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CustomPartFromFileDto)
  parts: CustomPartFromFileDto[];

  @ApiProperty({
    description: 'Приоритет заказа',
    example: 1,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  priority?: number;
}
