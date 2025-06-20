import { IsInt, IsOptional, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePickerDto {
  @ApiProperty({ description: 'ID пользователя для создания комплектовщика' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  userId: number;
}

export class UpdatePickerDto {
  @ApiPropertyOptional({ description: 'ID пользователя для обновления привязки' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  userId?: number;
}

export class PickerResponseDto {
  @ApiProperty({ description: 'ID комплектовщика' })
  pickerId: number;

  @ApiProperty({ description: 'ID пользователя' })
  userId: number;

  @ApiProperty({ description: 'Информация о пользователе' })
  user: {
    userId: number;
    login: string;
    userDetail?: {
      firstName: string;
      lastName: string;
      phone?: string;
      position?: string;
    };
  };

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;
}

export class CreatePickerWithRoleDto {
  @ApiProperty({ description: 'ID пользователя для создания комплектовщика' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  userId: number;

  @ApiPropertyOptional({ 
    description: 'Автоматически назначить роль orderPicker',
    default: true 
  })
  @IsOptional()
  assignRole?: boolean = true;
}

export class PickerWithRoleResponseDto {
  @ApiProperty({ description: 'Информация о созданном комплектовщике' })
  picker: PickerResponseDto;

  @ApiProperty({ description: 'ID созданной привязки роли (если была создана)' })
  roleBindingId?: number;

  @ApiProperty({ description: 'Сообщение о результате операции' })
  message: string;
}