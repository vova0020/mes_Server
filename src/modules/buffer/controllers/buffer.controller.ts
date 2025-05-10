
import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { BuffersService, FormattedBufferCell } from '../services/buffer.service';

@ApiTags('buffer')
@Controller('buffer')
export class BuffersController {
  private readonly logger = new Logger(BuffersController.name);

  constructor(private readonly buffersService: BuffersService) {}

  // Получение списка ячеек буфера
  @Get('cells')
  @ApiOperation({ summary: 'Получить список ячеек буфера' })
  @ApiResponse({
    status: 200,
    description: 'Список ячеек буфера успешно получен',
  })
  @ApiResponse({ status: 404, description: 'Ячейки буфера не найдены' })
  @ApiQuery({
    name: 'segmentId',
    required: false,
    type: Number,
    description: 'ID производственного участка для фильтрации ячеек буфера',
  })
  async getBufferCells(@Query('segmentId') segmentId?: string): Promise<FormattedBufferCell[]> {
    this.logger.log(
      `Получен запрос на получение ячеек буфера${segmentId ? ` для участка: ${segmentId}` : ''}`,
    );

    try {
      // Преобразуем segmentId в числовой тип, если параметр был передан
      const segmentIdNumber = segmentId ? parseInt(segmentId, 10) : undefined;

      const bufferCells =
        await this.buffersService.getBufferCells(segmentIdNumber);

      if (!bufferCells || bufferCells.length === 0) {
        this.logger.warn('Ячейки буфера не найдены');
        throw new NotFoundException('Ячейки буфера не найдены');
      }

      this.logger.log(`Возвращено ${bufferCells.length} ячеек буфера`);
      return bufferCells;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Ошибка при получении ячеек буфера: ${error.message}`);
      throw new InternalServerErrorException(
        'Произошла ошибка при получении ячеек буфера',
      );
    }
  }

  // Получение конкретной ячейки буфера по ID
  @Get('cells/:id')
  @ApiOperation({ summary: 'Получить ячейку буфера по ID' })
  @ApiParam({ name: 'id', description: 'ID ячейки буфера' })
  @ApiResponse({ status: 200, description: 'Ячейка буфера успешно получена' })
  @ApiResponse({ status: 404, description: 'Ячейка буфера не найдена' })
  async getBufferCellById(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Получен запрос на получение ячейки буфера с ID: ${id}`);

    try {
      const bufferCell = await this.buffersService.getBufferCellById(id);

      if (!bufferCell) {
        throw new NotFoundException(`Ячейка буфера с ID ${id} не найдена`);
      }

      return bufferCell;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Ошибка при получении ячейки буфера с ID ${id}: ${error.message}`,
      );
      throw new InternalServerErrorException(
        `Произошла ошибка при получении ячейки буфера с ID ${id}`,
      );
    }
  }
}
