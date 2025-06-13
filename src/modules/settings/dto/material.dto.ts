import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMaterialDto {
  @ApiProperty({
    description: 'Название материала',
    example: 'Сталь нержавеющая',
  })
  @IsString()
  @IsNotEmpty()
  materialName: string;

  @ApiProperty({
    description: 'Артикул материала',
    example: 'А-124',
  })
  @IsString()
  @IsNotEmpty()
  article: string;

  @ApiProperty({
    description: 'Единица измерения',
    example: 'кг',
  })
  @IsString()
  @IsNotEmpty()
  unit: string;

  @ApiProperty({
    description: 'Массив ID групп для привязки материала',
    required: false,
    example: [1, 2],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  groupIds?: number[];
}

export class UpdateMaterialDto {
  @ApiProperty({
    description: 'Название материала',
    required: false,
    example: 'Сталь углеродистая',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  materialName?: string;

  @ApiProperty({
    description: 'Артикул материала',
    required: false,
    example: 'А-1245',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  article?: string;

  @ApiProperty({
    description: 'Единица измерения',
    required: false,
    example: 'т',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  unit?: string;

  @ApiProperty({
    description: 'Массив ID групп для привязки материала',
    required: false,
    example: [1, 3],
  })
  @IsArray()
  @IsInt({ each: true })
  @IsOptional()
  groupIds?: number[];
}

export class MaterialResponseDto {
  @ApiProperty({
    description: 'ID материала',
    example: 1,
  })
  materialId: number;

  @ApiProperty({
    description: 'Название материала',
    example: 'Сталь нержавеющая',
  })
  materialName: string;

  @ApiProperty({
    description: 'Артикул материала',
    example: 'А-123',
  })
  article: string;

  @ApiProperty({
    description: 'Единица измерения',
    example: 'кг',
  })
  unit: string;

  @ApiProperty({
    description: 'Группы, к которым привязан материал',
    example: [
      { groupId: 1, groupName: 'Металлы' },
      { groupId: 2, groupName: 'Конструкционные материалы' },
    ],
  })
  groups?: {
    groupId: number;
    groupName: string;
  }[];
}
