import { IsInt, IsNotEmpty, IsString, IsOptional, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO для привязки оператора к станку по коду
 */
export class BindOperatorToMachineDto {
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  userId: number;

  @IsString()
  @IsNotEmpty()
  machineCode: string;
}

/**
 * DTO для отвязки оператора от станка
 */
export class UnbindOperatorFromMachineDto {
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  userId: number;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  machineId: number;
}

/**
 * DTO для получения информации о привязке оператора
 */
export class GetOperatorBindingDto {
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  userId: number;
}

/**
 * Информация об операторе, привязанном к станку
 */
export class BoundOperatorInfo {
  userId: number;
  operatorNumber: number;
  firstName: string;
  lastName: string;
  position?: string;
  boundAt: Date;
}

/**
 * DTO ответа с информацией о привязке оператора
 */
export class OperatorBindingResponseDto {
  /** Привязан ли оператор к станку */
  isBound: boolean;

  /** Информация о станке, если оператор привязан */
  machine?: {
    machineId: number;
    machineName: string;
    machineCode: string;
    operatorNumber: number;
    boundAt: Date;
  };

  /** Список всех операторов, привязанных к этому станку */
  otherOperators?: BoundOperatorInfo[];
}

/**
 * DTO ответа после успешной привязки
 */
export class BindOperatorResponseDto {
  success: boolean;
  message: string;
  binding: {
    bindingId: number;
    machineId: number;
    machineName: string;
    machineCode: string;
    operatorNumber: number;
    boundAt: Date;
  };
  /** Другие операторы на этом станке */
  otherOperators: BoundOperatorInfo[];
}

/**
 * DTO ответа после отвязки
 */
export class UnbindOperatorResponseDto {
  success: boolean;
  message: string;
  unboundAt: Date;
}

/**
 * DTO для получения списка привязок станка
 */
export class GetMachineBindingsDto {
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  machineId: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  activeOnly?: boolean = true;
}

/**
 * DTO ответа со списком привязок станка
 */
export class MachineBindingsResponseDto {
  machineId: number;
  machineName: string;
  machineCode: string;
  activeOperators: BoundOperatorInfo[];
  totalActive: number;
}

/**
 * DTO для изменения номера оператора
 */
export class ChangeOperatorNumberDto {
  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  userId: number;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  machineId: number;

  @IsInt()
  @Type(() => Number)
  @IsNotEmpty()
  newOperatorNumber: number;
}

/**
 * DTO ответа после изменения номера
 */
export class ChangeOperatorNumberResponseDto {
  success: boolean;
  message: string;
  oldNumber: number;
  newNumber: number;
}
