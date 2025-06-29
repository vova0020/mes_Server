/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/* eslint-disable @typescript-eslint/no-unsafe-return */
import {
  BadRequestException,
  Body,
  Controller,
  Get,
  InternalServerErrorException,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  Logger,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { PalletsMasterService } from '../services/pallets-Master.service';
import {
  AssignPalletToMachineDto,
  MovePalletToBufferDto,
  PalletOperationResponseDto,
  PalletsResponseDto,
  UpdateOperationStatusDto,
} from '../dto/pallet-master.dto';
import {
  MachineTaskMasterResponseDto,
  MachineTaskQueryDto,
} from '../dto/machine-taskDetail.dto';

@ApiTags('master pallets')
@Controller('master')
export class PalletsMasterController {
  // создаём собственный логгер с именем контроллера
  private readonly logger = new Logger(PalletsMasterController.name);

  // инжектим PalletsMasterService, но называем параметр palletOperationsService,
  // чтобы он совпадал с тем, как вы его используете в методах ниже
  constructor(private readonly palletOperationsService: PalletsMasterService) {}

  @Get('pallets/:detailId/:stageid')
  @ApiOperation({
    summary: 'Получить поддоны по ID детали для страницы мастера',
  })
  @ApiParam({ name: 'detailId', description: 'ID детали', type: Number })
  @ApiParam({ name: 'stageid', description: 'ID этапа', type: Number })
  @ApiResponse({
    status: 200,
    description:
      'Список поддонов с информацией о буфере и станке для страницы мастера',
    type: PalletsResponseDto,
  })
  async getPalletsByDetailId(
    @Param('detailId', ParseIntPipe) detailId: number,
    @Param('stageid', ParseIntPipe) stageid: number,
  ): Promise<PalletsResponseDto> {
    return this.palletOperationsService.getPalletsByDetailId(detailId,stageid);
  }

  @Post('assign-to-machine')
  @ApiOperation({ summary: 'Назначить поддон на станок' })
  @ApiBody({ type: AssignPalletToMachineDto })
  @ApiResponse({
    status: 200,
    description: 'Поддон успешно назначен на станок',
    type: PalletOperationResponseDto,
  })
  async assignPalletToMachine(@Body() assignDto: AssignPalletToMachineDto) {
    // Теперь this.logger — не undefined
    this.logger.log(
      `Получен запрос на назначение поддона ${assignDto.palletId} на станок ${assignDto.machineId}`,
    );

    try {
      return await this.palletOperationsService.assignPalletToMachine(
        assignDto.palletId,
        assignDto.machineId,
        assignDto.segmentId,
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
  @ApiOperation({
    summary: 'Обновить статус операции (готово/в работе/выполнено частично)',
  })
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

      this.logger.error(
        `Ошибка при обновлении статуса операции: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Произошла ошибка при обновлении статуса операции',
      );
    }
  }

  @Get('machine-tasks')
  @ApiOperation({ summary: 'Получить сменное задание для станка' })
  @ApiResponse({
    status: 200,
    description: 'Список заданий для станка',
    type: [MachineTaskMasterResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Станок не найден',
  })
  async getMachineTasks(
    @Query() query: MachineTaskQueryDto,
  ): Promise<MachineTaskMasterResponseDto[]> {
    this.logger.log(
      `Запрос на получение заданий для станка с ID: ${query.machineId}`,
    );
    return this.palletOperationsService.getMachineTasksById(query.machineId);
  }
}
