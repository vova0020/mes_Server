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
  CreatePalletDto,
  CreatePalletResponseDto,
  DefectPalletPartsDto,
  MovePalletToBufferDto,
  PalletOperationResponseDto,
  PalletsResponseDto,
  RedistributePalletPartsDto,
  RedistributePalletPartsResponseDto,
  UpdateOperationStatusDto,
} from '../dto/pallet-master.dto';
import {
  MachineTaskMasterResponseDto,
  MachineTaskQueryDto,
} from '../dto/machine-taskDetail.dto';

@ApiTags('master pallets')
@Controller('master')
export class PalletsMasterController {
  // соз��аём собственный логгер с именем контроллера
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
        updateDto.stageId,
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

  @Post('create-pallet')
  @ApiOperation({ summary: 'Создать новый поддон для детали' })
  @ApiBody({ type: CreatePalletDto })
  @ApiResponse({
    status: 200,
    description: 'Поддон успешно создан',
    type: CreatePalletResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Деталь не найдена',
  })
  @ApiResponse({
    status: 400,
    description: 'Недостаточно деталей для создания поддона',
  })
  async createPallet(@Body() createDto: CreatePalletDto): Promise<CreatePalletResponseDto> {
    this.logger.log(
      `Получен запрос на создание поддона для детали ${createDto.partId} с количеством ${createDto.quantity}`,
    );

    try {
      return await this.palletOperationsService.createPallet(
        createDto.partId,
        createDto.quantity,
        createDto.palletName,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.message) {
        throw new BadRequestException(error.message);
      }

      this.logger.error(
        `Ошибка при создании поддона: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Произошла ошибка при создании поддона',
      );
    }
  }

  @Post('create-pallet-by-part')
  @ApiOperation({ summary: 'Создать новый поддон по ID детали' })
  @ApiBody({ 
    schema: {
      type: 'object',
      properties: {
        partId: { type: 'number', description: 'ID детали', example: 1 },
        quantity: { type: 'number', description: 'Количество деталей на поддоне', example: 100 },
        palletName: { type: 'string', description: 'Название поддона (опционально)', example: 'Поддон-001' }
      },
      required: ['partId', 'quantity']
    }
  })
  @ApiResponse({
    status: 200,
    description: 'Поддон усп��шно создан',
    type: CreatePalletResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Деталь не найдена',
  })
  @ApiResponse({
    status: 400,
    description: 'Недостаточно деталей для создания поддона',
  })
  async createPalletByPartId(@Body() body: { partId: number; quantity: number; palletName?: string }): Promise<CreatePalletResponseDto> {
    this.logger.log(
      `Получен запрос на создание поддона для детали ${body.partId} с количеством ${body.quantity}`,
    );

    try {
      return await this.palletOperationsService.createPalletByPartId(
        body.partId,
        body.quantity,
        body.palletName,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.message) {
        throw new BadRequestException(error.message);
      }

      this.logger.error(
        `Ошибка при создании поддона: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Произошла ошибка при создании поддона',
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
      `Запрос на получение заданий для станка с ID: ${query.machineId}, этап: ${query.stageId}`,
    );
    return this.palletOperationsService.getMachineTasksById(query.machineId, query.stageId);
  }

  @Post('defect-parts')
  @ApiOperation({ summary: 'Отбраковать детали с поддона' })
  @ApiBody({ type: DefectPalletPartsDto })
  @ApiResponse({
    status: 200,
    description: 'Детали успешно отбракованы',
  })
  async defectPalletParts(@Body() defectDto: DefectPalletPartsDto) {
    this.logger.log(
      `Отбраковка ${defectDto.quantity} деталей с поддона ${defectDto.palletId}`,
    );

    try {
      return await this.palletOperationsService.defectPalletParts(
        defectDto.palletId,
        defectDto.quantity,
        defectDto.reportedById,
        defectDto.description,
        defectDto.machineId,
        defectDto.stageId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.message) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(`Ошибка при отбраковке: ${error.message}`);
      throw new InternalServerErrorException('Ошибка при отбраковке деталей');
    }
  }

  @Post('redistribute-parts')
  @ApiOperation({ summary: 'Перераспределить детали между поддонами' })
  @ApiBody({ type: RedistributePalletPartsDto })
  @ApiResponse({
    status: 200,
    description: 'Детали успешно перераспределены',
    type: RedistributePalletPartsResponseDto,
  })
  async redistributePalletParts(@Body() redistributeDto: RedistributePalletPartsDto): Promise<RedistributePalletPartsResponseDto> {
    this.logger.log(
      `Перераспределение деталей с поддона ${redistributeDto.sourcePalletId}`,
    );

    try {
      return await this.palletOperationsService.redistributePalletParts(
        redistributeDto.sourcePalletId,
        redistributeDto.distributions,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.message) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(`Ошибка при перераспределении: ${error.message}`);
      throw new InternalServerErrorException('Ошибка при перераспределении деталей');
    }
  }
}