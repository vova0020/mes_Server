import { ApiProperty } from '@nestjs/swagger';

export class ParsedCustomPartDto {
  @ApiProperty({
    description: 'Код детали',
    example: 'DET-001',
  })
  code: string;

  @ApiProperty({
    description: 'Название детали',
    example: 'Столешница',
  })
  name: string;

  @ApiProperty({
    description: 'Количество',
    example: 5,
  })
  quantity: number;
}
