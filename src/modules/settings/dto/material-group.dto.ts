import { IsString, IsNotEmpty, IsOptional, IsInt } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMaterialGroupDto {
  @ApiProperty({
    description: 'Название группы материалов',
    example: 'Металлы',
  })
  @IsString()
  @IsNotEmpty()
  groupName: string;
}

export class UpdateMaterialGroupDto {
  @ApiProperty({
    description: 'Название группы материалов',
    required: false,
    example: 'Сплавы металлов',
  })
  @IsString()
  @IsOptional()
  @IsNotEmpty()
  groupName?: string;
}

export class MaterialGroupResponseDto {
  @ApiProperty({
    description: 'ID группы',
    example: 1,
  })
  groupId: number;

  @ApiProperty({
    description: 'Название группы материалов',
    example: 'Металлы',
  })
  groupName: string;

  @ApiProperty({
    description: 'Количество материалов в группе',
    example: 5,
  })
  materialsCount?: number;
}

export class LinkMaterialToGroupDto {
  @ApiProperty({
    description: 'ID группы материалов',
    example: 1,
  })
  @IsInt()
  groupId: number;

  @ApiProperty({
    description: 'ID материала',
    example: 2,
  })
  @IsInt()
  materialId: number;
}
