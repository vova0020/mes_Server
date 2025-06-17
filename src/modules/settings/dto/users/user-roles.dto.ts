import { IsEnum, IsInt, IsOptional, IsNotEmpty, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Жёстко заданные роли
export enum UserRoleType {
  ADMIN = 'admin',
  MANAGEMENT = 'management',
  TECHNOLOGIST = 'technologist',
  MASTER = 'master',
  OPERATOR = 'operator',
  ORDER_PICKER = 'orderPicker',
  WORKPLACE = 'workplace'
}

// Типы контекстов для привязки ролей
export enum RoleContextType {
  MACHINE = 'MACHINE',           // workplace → станок
  STAGE_LEVEL1 = 'STAGE_LEVEL1', // master/operator → этап 1-го уровня
  ORDER_PICKER = 'ORDER_PICKER'  // orderPicker → задачи комплектовщика
}

export class CreateUserRoleDto {
  @ApiProperty({ description: 'ID пользователя' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  userId: number;

  @ApiProperty({ description: 'Роль пользователя', enum: UserRoleType })
  @IsEnum(UserRoleType)
  @IsNotEmpty()
  role: UserRoleType;
}

export class CreateRoleBindingDto {
  @ApiProperty({ description: 'ID пользователя' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  userId: number;

  @ApiProperty({ description: 'Роль пользователя', enum: UserRoleType })
  @IsEnum(UserRoleType)
  @IsNotEmpty()
  role: UserRoleType;

  @ApiProperty({ description: 'Тип контекста', enum: RoleContextType })
  @IsEnum(RoleContextType)
  @IsNotEmpty()
  contextType: RoleContextType;

  @ApiProperty({ description: 'ID объекта контекста' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  contextId: number;
}

export class UpdateRoleBindingDto {
  @ApiPropertyOptional({ description: 'Роль пользователя', enum: UserRoleType })
  @IsEnum(UserRoleType)
  @IsOptional()
  role?: UserRoleType;

  @ApiPropertyOptional({ description: 'Тип контекста', enum: RoleContextType })
  @IsEnum(RoleContextType)
  @IsOptional()
  contextType?: RoleContextType;

  @ApiPropertyOptional({ description: 'ID объекта контекста' })
  @IsInt()
  @Min(1)
  @Type(() => Number)
  @IsOptional()
  contextId?: number;
}

export class UserRolesResponseDto {
  @ApiProperty({ description: 'ID пользователя' })
  userId: number;

  @ApiProperty({ description: 'Глобальные роли', type: [String] })
  globalRoles: UserRoleType[];

  @ApiProperty({ description: 'Контекстные привязки' })
  roleBindings: {
    id: number;
    role: UserRoleType;
    contextType: RoleContextType;
    contextId: number;
    contextName?: string;
  }[];
}