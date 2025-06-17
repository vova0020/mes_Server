import { IsString, IsOptional, IsEmail, MinLength, IsDecimal, IsPhoneNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Decimal } from '@prisma/client/runtime/library';

export class CreateUserDto {
  @ApiProperty({ description: 'Логин пользователя' })
  @IsString()
  @MinLength(3)
  login: string;

  @ApiProperty({ description: 'Пароль пользователя' })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ description: 'Имя пользователя' })
  @IsString()
  firstName: string;

  @ApiProperty({ description: 'Фамилия пользователя' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ description: 'Телефон пользователя' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Должность' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Зарплата' })
  @IsOptional()
  @IsDecimal()
  salary?: Decimal;
}

export class UpdateUserDto {
  @ApiPropertyOptional({ description: 'Логин пользователя' })
  @IsOptional()
  @IsString()
  @MinLength(3)
  login?: string;

  @ApiPropertyOptional({ description: 'Пароль пользователя' })
  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @ApiPropertyOptional({ description: 'Имя пользователя' })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({ description: 'Фамилия пользователя' })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({ description: 'Телефон пользователя' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ description: 'Должность' })
  @IsOptional()
  @IsString()
  position?: string;

  @ApiPropertyOptional({ description: 'Зарплата' })
  @IsOptional()
  @IsDecimal()
  salary?: Decimal;
}

export class UserResponseDto {
  @ApiProperty({ description: 'ID пользователя' })
  userId: number;

  @ApiProperty({ description: 'Логин пользователя' })
  login: string;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Детали пользователя' })
  userDetail?: {
    firstName: string;
    lastName: string;
    phone?: string;
    position?: string;
    salary?: Decimal;
  };
}