
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
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { MachinService } from '../services/machin.service';

@ApiTags('machin')
@Controller('machin')
export class MachinsController {
  private readonly logger = new Logger(MachinsController.name);

  constructor(private readonly machinService: MachinService) {}

  // Получение списка станков
  @Get('all')
  @ApiOperation({ summary: 'Получить список всех станков' })
  @ApiResponse({ status: 200, description: 'Список станков успешно получен' })
  @ApiResponse({ status: 404, description: 'Станки не найдены' })
  async getMachines() {
    this.logger.log('Получен запрос на получение станков');

    try {
      const machinsAll = await this.machinService.getMachines();

      if (!machinsAll || machinsAll.length === 0) {
        this.logger.warn('Станки не найдены');
        throw new NotFoundException('Станки не найдены');
      }

      this.logger.log(`Возвращено ${machinsAll.length} Станков`);
      return machinsAll;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Ошибка при получении станков: ${error.message}`);
      throw new InternalServerErrorException(
        'Произошла ошибка при получении станков',
      );
    }
  }

  // Получение списка станков с информацией о поддонах в обработке
  @Get('with-pallets')
  @ApiOperation({ summary: 'Получить список станков с информацией о поддонах в обработке' })
  @ApiResponse({ status: 200, description: 'Список станков с поддонами успешно получен' })
  @ApiResponse({ status: 404, description: 'Станки не найдены' })
  async getMachinesWithPallets() {
    this.logger.log('Получен запрос на получение станков с информацией о поддонах');

    try {
      const machinesWithPallets = await this.machinService.getMachinesWithActivePallets();

      if (!machinesWithPallets || machinesWithPallets.length === 0) {
        this.logger.warn('Станки не найдены');
        throw new NotFoundException('Станки не найдены');
      }

      this.logger.log(`Возвращено ${machinesWithPallets.length} станков с информацией о поддонах`);
      return machinesWithPallets;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Ошибка при получении станков с поддонами: ${error.message}`);
      throw new InternalServerErrorException(
        'Произошла ошибка при получении станков с информацией о поддонах',
      );
    }
  }

  // Получение конкретного станка по ID с информацией о поддонах в обработке
  @Get(':id/with-pallets')
  @ApiOperation({ summary: 'Получить станок по ID с информацией о поддонах в обработке' })
  @ApiParam({ name: 'id', description: 'ID станка' })
  @ApiResponse({ status: 200, description: 'Станок с поддонами успешно получен' })
  @ApiResponse({ status: 404, description: 'Станок не найден' })
  async getMachineWithPalletsById(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Получен запрос на получение станка с ID: ${id} и информацией о поддонах`);

    try {
      const machine = await this.machinService.getMachineWithActivePalletsById(id);

      if (!machine) {
        this.logger.warn(`Станок с ID ${id} не найден`);
        throw new NotFoundException(`Станок с ID ${id} не найден`);
      }

      return machine;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Ошибка при получении станка с ID ${id} и поддонами: ${error.message}`);
      throw new InternalServerErrorException(
        `Произошла ошибка при получении станка с ID ${id} и информацией о поддонах`,
      );
    }
  }


  
}
