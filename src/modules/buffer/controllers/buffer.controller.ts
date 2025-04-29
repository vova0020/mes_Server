import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger'; // Добавлен импорт ApiTags
import { BuffersService } from '../services/buffer.service';

@ApiTags('buffer')
@Controller('buffer')
export class BuffersController {
  private readonly logger = new Logger(BuffersController.name);

  constructor(private readonly buffersService: BuffersService) {}

  // Получение списка ячеек буфера
  @Get('cells')
  async getBufferCells() {
    this.logger.log('Получен запрос на получение ячеек буфера');

    try {
      const bufferCells = await this.buffersService.getBufferCells();

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
