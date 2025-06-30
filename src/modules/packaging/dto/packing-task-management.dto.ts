import { IsOptional, IsInt, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { PackingTaskStatus } from '@prisma/client';

// DTO для перемещения задания на другой станок
export class MoveTaskToMachineDto {
  @IsInt({ message: 'ID нового станка должен быть числом' })
  @Type(() => Number)
  machineId: number;

  @IsOptional()
  @IsInt({ message: 'ID пользователя должен быть числом' })
  @Type(() => Number)
  assignedTo?: number;
}

// DTO для обновления статуса задания
export class UpdateTaskStatusDto {
  @IsEnum(PackingTaskStatus, { message: 'Неверный статус задания' })
  status: PackingTaskStatus;
}

// DTO для наз��ачения пользователя на задание
export class AssignUserToTaskDto {
  @IsOptional()
  @IsInt({ message: 'ID пользователя должен быть числом' })
  @Type(() => Number)
  assignedTo?: number;
}