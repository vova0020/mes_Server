import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { PalletOperationsService } from '../services/pallet-operations.service';
import {
  AssignPalletToMachineDto,
  MovePalletToBufferDto,
  UpdateOperationStatusDto,
  PalletOperationResponseDto,
} from '../dto/pallet-operations.dto';

@ApiTags('pallet-operations')
@Controller('pallet-operations')
export class PalletOperationsController {
  private readonly logger = new Logger(PalletOperationsController.name);

  constructor(
    private readonly palletOperationsService: PalletOperationsService,
  ) {}

  @Post('assign-to-machine')
  @ApiOperation({ summary: 'Назначить поддон на станок' })
  @ApiBody({ type: AssignPalletToMachineDto })
  @ApiResponse({
    status: 200,
    description: 'Поддон успешно назначен на стано��',
    type: PalletOperationResponseDto,
  })
  async assignPalletToMachine(@Body() assignDto: AssignPalletToMachineDto) {
    this.logger.log(
      `Получен запрос на назначение поддона ${assignDto.palletId} на станок ${assignDto.machineId}`,
    );

    try {
      return await this.palletOperationsService.assignPalletToMachine(
        assignDto.palletId,
        assignDto.machineId,
        assignDto.processStepId,
        assignDto.operatorId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.message) {
        throw new BadRequestException(error.message);
      }

      this.logger.error(
        `Ошибка при назначении поддона на станок: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Произошла ошибка при назначении поддона на станок',
      );
    }
  }

  @Post('move-to-buffer')
  @ApiOperation({
    summary: 'Переместить поддон в буфер (без влияния на статус операции)',
  })
  @ApiBody({ type: MovePalletToBufferDto })
  @ApiResponse({
    status: 200,
    description: 'Поддон успешно перемещен в буфер',
  })
  async movePalletToBuffer(@Body() moveDto: MovePalletToBufferDto) {
    this.logger.log(
      `Получен запрос на перемещение поддона ${moveDto.palletId} в буфер`,
    );

    try {
      return await this.palletOperationsService.movePalletToBuffer(
        moveDto.palletId,
        moveDto.bufferCellId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.message) {
        throw new BadRequestException(error.message);
      }

      this.logger.error(
        `Ошибка при перемещении поддона в буфер: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Произошла ошибка при перемещении поддона в буфер',
      );
    }
  }

  @Post('update-status')
  @ApiOperation({ summary: 'Обновить статус операции (гот��во/в работе/выполнено частично)' })
  @ApiBody({ type: UpdateOperationStatusDto })
  @ApiResponse({
    status: 200,
    description: 'Статус операции успешно обновлен',
    type: PalletOperationResponseDto,
  })
  async updateOperationStatus(@Body() updateDto: UpdateOperationStatusDto) {
    this.logger.log(
      `Получен запрос на обновление статуса операции ${updateDto.operationId} на ${updateDto.status}`,
    );

    try {
      return await this.palletOperationsService.updateOperationStatus(
        updateDto.operationId,
        updateDto.status,
        updateDto.masterId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.message) {
        throw new BadRequestException(error.message);
      }

      this.logger.error(`Ошибка при обновлении статуса операции: ${error.message}`);
      throw new InternalServerErrorException(
        'Произошла ошибка при обновлении статуса операции',
      );
    }
  }

  @Get('active')
  @ApiOperation({ summary: 'Получить список активных операций' })
  @ApiResponse({
    status: 200,
    description: 'Список активных операций успешно получен',
  })
  async getActiveOperations() {
    this.logger.log('Получен запрос на получение активных операций');

    try {
      return await this.palletOperationsService.getActiveOperations();
    } catch (error) {
      this.logger.error(
        `Ошибка при получении активных операций: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Произошла ошибка при получении активных операций',
      );
    }
  }

  @Get('buffered')
  @ApiOperation({ summary: 'Получить список поддонов в буфере' })
  @ApiResponse({
    status: 200,
    description: 'Список поддонов в буфере успешно получен',
  })
  async getBufferedOperations() {
    this.logger.log('Получен запрос на получение поддонов в буфере');

    try {
      return await this.palletOperationsService.getBufferedOperations();
    } catch (error) {
      this.logger.error(
        `Ошибка при получении поддонов в бу��ере: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Произошла ошибка при получении поддонов в буфере',
      );
    }
  }

  @Get('history/:palletId')
  @ApiOperation({ summary: 'Получить историю операций для поддона' })
  @ApiParam({ name: 'palletId', description: 'ID поддона' })
  @ApiResponse({
    status: 200,
    description: 'История операций успешно получена',
  })
  async getPalletOperationHistory(
    @Param('palletId', ParseIntPipe) palletId: number,
  ) {
    this.logger.log(`Получен запрос на историю операций поддона ${palletId}`);

    try {
      return await this.palletOperationsService.getPalletOperationHistory(
        palletId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Ошибка при получении истории операций поддона: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Произошла ошибка при получении истории операций поддона',
      );
    }
  }
}