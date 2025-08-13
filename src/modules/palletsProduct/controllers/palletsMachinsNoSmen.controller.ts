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
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBody,
} from '@nestjs/swagger';
import { PalletMachineNoSmenService } from '../services/pallets-MachineNoSmen.service';
import {
  MovePalletToBufferDto,
  PalletsResponseDto,
  CreatePalletDto,
  CreatePalletResponseDto,
  DefectPalletPartsDto,
  RedistributePalletPartsDto,
  RedistributePalletPartsResponseDto,
} from '../dto/pallet-master.dto';
import {
  StartPalletProcessingDto,
  CompletePalletProcessingDto,
} from '../dto/pallet.dto';

@ApiTags('Станки без сменного задания')
@Controller('machines-no-smen')
export class PalletsMachinsNoSmenController {
  private readonly logger = new Logger(PalletsMachinsNoSmenController.name);

  constructor(
    private readonly palletMachineNoSmenService: PalletMachineNoSmenService,
  ) { }

  @Get('/available-pallets/:detailId/:stageid')
  @ApiOperation({
    summary: 'Получить доступные поддоны для станка без сменного задания',
    description: 'Станок сам выбирает поддоны для работы (как у мастера)',
  })
  // @ApiParam({ name: 'machineId', description: 'ID станка', type: Number })
  @ApiParam({ name: 'detailId', description: 'ID детали', type: Number })
  @ApiParam({ name: 'stageid', description: 'ID этапа', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Список доступных поддонов для станка',
    type: PalletsResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Станок не найден',
  })
  async getAvailablePalletsForMachine(
    // @Param('machineId', ParseIntPipe) machineId: number,
    @Param('detailId', ParseIntPipe) detailId: number,
    @Param('stageid', ParseIntPipe) stageid: number,
  ): Promise<PalletsResponseDto> {
    this.logger.log(
      `Получен запрос на доступные поддоны для станка без сменного задания ${detailId}`,
    );

    try {
      return await this.palletMachineNoSmenService.getPalletsByDetailId(
        detailId,
        stageid,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.message) {
        throw new BadRequestException(error.message);
      }

      this.logger.error(
        `Ошибка при получении доступных поддонов: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Произошла ошибка при получении доступных поддонов',
      );
    }
  }

  @Post('take-to-work')
  @ApiOperation({
    summary: 'Взять поддон в работу',
    description: 'Станок сам назначает себе поддон и создает сменное задание',
  })
  @ApiBody({ type: StartPalletProcessingDto })
  @ApiResponse({
    status: 200,
    description: 'Поддон успешно взят в работу',
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка при взятии поддона в работу',
  })
  async takePalletToWork(@Body() dto: StartPalletProcessingDto) {
    this.logger.log(
      `Получен запрос на взятие поддона ${dto.palletId} в работу станком ${dto.machineId}`,
    );

    try {
      return await this.palletMachineNoSmenService.takePalletToWork(
        dto.palletId,
        dto.machineId,
        dto.stageId!,
        dto.operatorId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.message) {
        throw new BadRequestException(error.message);
      }

      this.logger.error(`Ошибка при взятии поддона в работу: ${error.message}`);
      throw new InternalServerErrorException(
        'Произошла ошибка при взятии поддона в работу',
      );
    }
  }

  @Post('complete-processing')
  @ApiOperation({
    summary: 'Завершить обработку поддона',
    description: 'Завершить обработку поддона на станке без сменного задания',
  })
  @ApiBody({ type: CompletePalletProcessingDto })
  @ApiResponse({
    status: 200,
    description: 'Обработка поддона успешно завершена',
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка при завершении обработки поддона',
  })
  async completePalletProcessing(@Body() dto: CompletePalletProcessingDto) {
    this.logger.log(
      `Получен запрос на завершение обработки поддона ${dto.palletId} на станке ${dto.machineId}`,
    );

    try {
      return await this.palletMachineNoSmenService.completePalletProcessing(
        dto.palletId,
        dto.machineId,
        dto.stageId!,
        dto.operatorId,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      if (error.message) {
        throw new BadRequestException(error.message);
      }

      this.logger.error(
        `Ошибка при завершении обработки поддона: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Произошла ошибка при завершении обработки поддона',
      );
    }
  }

  @Post('move-to-buffer')
  @ApiOperation({
    summary: 'Переместить поддон в буфер',
    description: 'Переместить поддон в указанную ячейку буфера',
  })
  @ApiBody({ type: MovePalletToBufferDto })
  @ApiResponse({
    status: 200,
    description: 'Поддон успешно перемещен в буфер',
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка при перемещении поддона в буфер',
  })
  async movePalletToBuffer(@Body() moveDto: MovePalletToBufferDto) {
    this.logger.log(
      `Получен запрос на перемещение поддона ${moveDto.palletId} в буфер (ячейка ${moveDto.bufferCellId})`,
    );

    try {
      return await this.palletMachineNoSmenService.movePalletToBuffer(
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
      return await this.palletMachineNoSmenService.createPallet(
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
        quantity: { type: 'number', description: 'Количество де��алей на поддоне', example: 100 },
        palletName: { type: 'string', description: 'Название поддона (опционально)', example: 'Поддон-001' }
      },
      required: ['partId', 'quantity']
    }
  })
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
  async createPalletByPartId(@Body() body: { partId: number; quantity: number; palletName?: string }): Promise<CreatePalletResponseDto> {
    this.logger.log(
      `Получен запрос на создание поддона для детали ${body.partId} с количеством ${body.quantity}`,
    );

    try {
      return await this.palletMachineNoSmenService.createPalletByPartId(
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
      return await this.palletMachineNoSmenService.defectPalletParts(
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
      return await this.palletMachineNoSmenService.redistributePalletParts(
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