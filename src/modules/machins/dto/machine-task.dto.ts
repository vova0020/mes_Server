
import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsInt } from 'class-validator';
import { Transform } from 'class-transformer';

// DTO для запроса сменного задания станка
export class MachineTaskQueryDto {
  @ApiProperty({
    description: 'ID станка для получения сменного задания',
    example: 1,
    required: true,
  })
  @Transform(({ value }) => parseInt(value, 10))
  @IsNumber()
  machineId: number;
}

// DTO для обновления приоритета задания
export class UpdateTaskPriorityDto {
  @ApiProperty({
    description: 'ID операции',
    example: 1,
  })
  @IsNumber()
  operationId: number;

  @ApiProperty({
    description: 'Новый приоритет задания (чем меньше число, тем выше приоритет)',
    example: 1,
  })
  @IsInt()
  priority: number;
}

// DTO для удаления задания по ID
export class DeleteTaskDto {
  @ApiProperty({
    description: 'ID операции для удаления',
    example: 1,
  })
  @IsNumber()
  operationId: number;
}

// DTO для перемещения задания на другой станок
export class MoveTaskDto {
  @ApiProperty({
    description: 'ID операции для перемещения',
    example: 1,
  })
  @IsNumber()
  operationId: number;

  @ApiProperty({
    description: 'ID станка, на который нужно переместить задание',
    example: 2,
  })
  @IsNumber()
  targetMachineId: number;
}

// DTO ответа с заданием для станка
export class MachineTaskResponseDto {
  @ApiProperty({
    description: 'ID операции',
    example: 1,
  })
  operationId: number;

  @ApiProperty({
    description: 'Приоритет задания',
    example: 1,
    nullable: true,
  })

  @ApiProperty({
    description: 'ID заказа',
    example: 1,
  })
  orderId: number;

  @ApiProperty({
    description: 'Название заказа',
    example: 'Заказ №123',
  })
  orderName: string;

  @ApiProperty({
    description: 'Артикул детали',
    example: 'ABC-123',
  })
  detailArticle: string;

  @ApiProperty({
    description: 'Название детали',
    example: 'Фасад кухонный',
  })
  detailName: string;

  @ApiProperty({
    description: 'Материал детали',
    example: 'ДСП',
  })
  detailMaterial: string;

  @ApiProperty({
    description: 'Размер детали',
    example: '600x800',
  })
  detailSize: string;

  @ApiProperty({
    description: 'Номер поддона',
    example: 'П-123',
  })
  palletName: string;

  @ApiProperty({
    description: 'Количество деталей на поддоне',
    example: 10,
  })
  quantity: number;

  @ApiProperty({
    description: 'Статус операции',
    example: 'ON_MACHINE',
    enum: ['ON_MACHINE', 'IN_PROGRESS', 'COMPLETED', 'BUFFERED'],
  })
  status: string;
  
  @ApiProperty({
    description: 'Статус выполнения',
    example: 'COMPLETED',
    enum: ['COMPLETED', 'IN_PROGRESS', 'PARTIALLY_COMPLETED'],
    nullable: true,
  })
  completionStatus: string | null; // Изменено с string на string | null
}
