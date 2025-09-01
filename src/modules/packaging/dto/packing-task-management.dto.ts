import { IsOptional, IsInt, IsEnum, IsNumber, Min } from 'class-validator';
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

// DTO для назачения пользователя на задание
export class AssignUserToTaskDto {
  @IsOptional()
  @IsInt({ message: 'ID пользователя должен быть числом' })
  @Type(() => Number)
  assignedTo?: number;
}

// DTO для назначения приоритета задания
export class SetTaskPriorityDto {
  @IsNumber({}, { message: 'Приоритет должен быть числом' })
  @Min(0, { message: 'Приоритет не может быть отрицательным' })
  @Type(() => Number)
  priority: number;
}

// DTO для взятия задания в работу
export class StartTaskDto {
  @IsInt({ message: 'ID станка должен быть числом' })
  @Type(() => Number)
  machineId: number;
}

// DTO для завершения задания
export class CompleteTaskDto {
  @IsInt({ message: 'ID станка должен быть числом' })
  @Type(() => Number)
  machineId: number;
}