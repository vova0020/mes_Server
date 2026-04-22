import { IsInt, IsOptional, IsEnum, Min, IsNumber } from 'class-validator';
import { Transform } from 'class-transformer';
import { PackingTaskStatus } from '@prisma/client';

// DTO для создания назначения задания на станок упаковки
export class CreatePackingAssignmentDto {
  @IsInt()
  @Min(1)
  packageId: number; // ID упаковочного пакета

  @IsInt()
  @Min(1)
  machineId: number; // ID станка упаковки

  @IsOptional()
  @IsInt()
  @Min(1)
  assignedTo?: number; // ID пользователя, которому назначается задача

  @IsOptional()
  @Transform(({ value }) => value !== undefined ? parseFloat(value) : 0)
  @IsNumber({}, { message: 'Приоритет должен быть числом' })
  @Min(0, { message: 'Приоритет не может быть отрицательным' })
  priority?: number = 0; // Приоритет задачи (по умолчанию 0)

  @IsOptional()
  @IsNumber({}, { message: 'Количество должно быть числом' })
  @Min(0.01, { message: 'Количество должно быть больше 0' })
  assignedQuantity?: number; // Назначенное количество для выполнения
}

// DTO дл�� обновления статуса задания упаковки
export class UpdatePackingAssignmentDto {
  @IsEnum(PackingTaskStatus)
  status: PackingTaskStatus; // Новый статус задачи

  @IsOptional()
  @IsInt()
  @Min(1)
  assignedTo?: number; // Переназначить пользователя
}

// DTO для запроса списка заданий упаковки
export class PackingAssignmentQueryDto {
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  machineId?: number; // Фильтр по станку

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  assignedTo?: number; // Фильтр по назначенному пользователю

  @IsOptional()
  @IsEnum(PackingTaskStatus)
  status?: PackingTaskStatus; // Фильтр по статусу

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  @IsInt()
  @Min(1)
  limit?: number = 10;
}