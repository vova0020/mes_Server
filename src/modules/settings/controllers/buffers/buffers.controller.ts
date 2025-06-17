import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Logger,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { BuffersService } from '../../services/buffers/buffers.service';
import { BufferCellsService } from '../../services/buffers/buffer-cells.service';
import { BufferStagesService } from '../../services/buffers/buffer-stages.service';
import {
  CreateBufferDto,
  UpdateBufferDto,
  CopyBufferDto,
  CreateBufferCellDto,
  UpdateBufferCellDto,
  CreateBufferStageDto,
  UpdateBufferStagesDto,
  BufferResponse,
  BufferDetailResponse,
  BufferCellResponse,
  BufferStageResponse,
  StagesWithBuffersResponse,
} from '../../dto/buffers/buffers.dto';

@ApiTags('Буферы')
@Controller('buffers')
export class BuffersController {
  private readonly logger = new Logger(BuffersController.name);

  constructor(
    private readonly buffersService: BuffersService,
    private readonly bufferCellsService: BufferCellsService,
    private readonly bufferStagesService: BufferStagesService,
  ) {}

  // ================================
  // CRUD операции для буферов
  // ================================

  @Get()
  @ApiOperation({ summary: 'Получить список всех буферов' })
  @ApiResponse({ status: 200, description: 'Список буферов успешно получен' })
  async getAllBuffers(): Promise<BufferResponse[]> {
    const startTime = Date.now();
    this.logger.log(
      '🔍 BuffersController.getAllBuffers: Запрос на получение всех буферов',
    );

    try {
      const result = await this.buffersService.getAllBuffers();
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.getAllBuffers: Успешно получено ${result.length} буферов за ${executionTime}ms`,
      );
      console.log(
        '📊 Список буферов:',
        result.map((b) => ({
          id: b.bufferId,
          name: b.bufferName,
          cellsCount: b.cellsCount,
        })),
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.getAllBuffers: Ошибка при получении буферов за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Получить статистику по буферам' })
  @ApiResponse({
    status: 200,
    description: 'Статистика буферов успешно получена',
  })
  async getBuffersStatistics() {
    const startTime = Date.now();
    this.logger.log(
      '📊 BuffersController.getBuffersStatistics: Запрос статистики буферов',
    );

    try {
      const result = await this.buffersService.getBuffersStatistics();
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.getBuffersStatistics: Статистика получена за ${executionTime}ms`,
      );
      console.log('📈 Статистика буферов:', JSON.stringify(result, null, 2));

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.getBuffersStatistics: Ошибка при получении статистики за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить буфер по ID' })
  @ApiParam({ name: 'id', description: 'ID буфера' })
  @ApiResponse({ status: 200, description: 'Буфер успешно найден' })
  @ApiResponse({ status: 404, description: 'Буфер не найден' })
  async getBufferById(
    @Param('id', ParseIntPipe) bufferId: number,
  ): Promise<BufferDetailResponse> {
    const startTime = Date.now();
    this.logger.log(
      `🔍 BuffersController.getBufferById: Запрос буфера с ID: ${bufferId}`,
    );

    try {
      const result = await this.buffersService.getBufferById(bufferId);
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.getBufferById: Буфер "${result.bufferName}" найден за ${executionTime}ms`,
      );
      console.log(`📋 Детали буфера:`, {
        id: result.bufferId,
        name: result.bufferName,
        location: result.location,
        cellsCount: result.cellsCount,
        stagesCount: result.stagesCount,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.getBufferById: Ошибка при поиске буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Post()
  @ApiOperation({ summary: 'Создать новый буфер' })
  @ApiResponse({ status: 201, description: 'Буфер успешно создан' })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  async createBuffer(
    @Body() createBufferDto: CreateBufferDto,
  ): Promise<BufferDetailResponse> {
    const startTime = Date.now();
    this.logger.log(
      `🆕 BuffersController.createBuffer: Запрос на создание буфера "${createBufferDto.bufferName}"`,
    );
    console.log(
      '📝 Данные для создания буфера:',
      JSON.stringify(createBufferDto, null, 2),
    );

    try {
      const result = await this.buffersService.createBuffer(createBufferDto);
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.createBuffer: Буфер "${result.bufferName}" создан с ID: ${result.bufferId} за ${executionTime}ms`,
      );
      console.log(`🎉 Создан буфер:`, {
        id: result.bufferId,
        name: result.bufferName,
        location: result.location,
        cellsCount: result.cellsCount,
        stagesCount: result.stagesCount,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.createBuffer: Ошибка при создании буфера "${createBufferDto.bufferName}" за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить буфер' })
  @ApiParam({ name: 'id', description: 'ID буфера' })
  @ApiResponse({ status: 200, description: 'Буфер успешно обновлен' })
  @ApiResponse({ status: 404, description: 'Буфер не найден' })
  async updateBuffer(
    @Param('id', ParseIntPipe) bufferId: number,
    @Body() updateBufferDto: UpdateBufferDto,
  ): Promise<BufferDetailResponse> {
    const startTime = Date.now();
    this.logger.log(
      `✏️ BuffersController.updateBuffer: Обновление буфера ID: ${bufferId}`,
    );
    console.log(
      '📝 Данные для обновления:',
      JSON.stringify(updateBufferDto, null, 2),
    );

    try {
      const result = await this.buffersService.updateBuffer(
        bufferId,
        updateBufferDto,
      );
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.updateBuffer: Буфер ID: ${bufferId} успешно обновлен за ${executionTime}ms`,
      );
      console.log(`🔄 Обновлен буфер:`, {
        id: result.bufferId,
        name: result.bufferName,
        location: result.location,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.updateBuffer: Ошибка при обновлении буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить буфер' })
  @ApiParam({ name: 'id', description: 'ID буфера' })
  @ApiResponse({ status: 200, description: 'Буфер успешно удален' })
  @ApiResponse({ status: 404, description: 'Буфер не найден' })
  @HttpCode(HttpStatus.OK)
  async deleteBuffer(@Param('id', ParseIntPipe) bufferId: number) {
    const startTime = Date.now();
    this.logger.log(
      `🗑️ BuffersController.deleteBuffer: Запрос на удаление буфера ID: ${bufferId}`,
    );

    try {
      const result = await this.buffersService.deleteBuffer(bufferId);
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.deleteBuffer: Буфер ID: ${bufferId} успешно удален за ${executionTime}ms`,
      );
      console.log(`🗑️ Удален буфер ID: ${bufferId}`);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.deleteBuffer: Ошибка при удалении буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(':id/copy')
  @ApiOperation({ summary: 'Скопировать буфер' })
  @ApiParam({ name: 'id', description: 'ID исходного буфера' })
  @ApiResponse({ status: 201, description: 'Буфер успешно скопирован' })
  @ApiResponse({ status: 404, description: 'Исходный буфер не найден' })
  async copyBuffer(
    @Param('id', ParseIntPipe) bufferId: number,
    @Body() copyBufferDto: CopyBufferDto,
  ): Promise<BufferDetailResponse> {
    const startTime = Date.now();
    this.logger.log(
      `📋 BuffersController.copyBuffer: Копирование буфера ID: ${bufferId} как "${copyBufferDto.newBufferName}"`,
    );
    console.log(
      '📝 Параметры копирования:',
      JSON.stringify(copyBufferDto, null, 2),
    );

    try {
      const result = await this.buffersService.copyBuffer(
        bufferId,
        copyBufferDto,
      );
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.copyBuffer: Буфер скопирован с новым ID: ${result.bufferId} за ${executionTime}ms`,
      );
      console.log(`📋 Скопирован буфер:`, {
        originalId: bufferId,
        newId: result.bufferId,
        newName: result.bufferName,
        cellsCount: result.cellsCount,
        stagesCount: result.stagesCount,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.copyBuffer: Ошибка при копировании буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // ================================
  // Операции с ячейками буфера
  // ================================

  @Get(':id/cells')
  @ApiOperation({ summary: 'Получить ячейки буфера' })
  @ApiParam({ name: 'id', description: 'ID буфера' })
  @ApiResponse({ status: 200, description: 'Ячейки буфера получены' })
  async getBufferCells(
    @Param('id', ParseIntPipe) bufferId: number,
  ): Promise<BufferCellResponse[]> {
    const startTime = Date.now();
    this.logger.log(
      `🔍 BuffersController.getBufferCells: Получение ячеек буфера ID: ${bufferId}`,
    );

    try {
      const result = await this.bufferCellsService.getBufferCells(bufferId);
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.getBufferCells: Получено ${result.length} ячеек для буфера ID: ${bufferId} за ${executionTime}ms`,
      );
      console.log(
        `📊 Ячейки буфера ${bufferId}:`,
        result.map((c) => ({
          id: c.cellId,
          code: c.cellCode,
          status: c.status,
          load: `${c.currentLoad}/${c.capacity}`,
        })),
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.getBufferCells: Ошибка при получении ячеек буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':id/cells/statistics')
  @ApiOperation({ summary: 'Получить статистику ячеек буфера' })
  @ApiParam({ name: 'id', description: 'ID буфера' })
  @ApiResponse({ status: 200, description: 'Статистика ячеек получена' })
  async getBufferCellsStatistics(@Param('id', ParseIntPipe) bufferId: number) {
    const startTime = Date.now();
    this.logger.log(
      `📊 BuffersController.getBufferCellsStatistics: Статистика ячеек буфера ID: ${bufferId}`,
    );

    try {
      const result =
        await this.bufferCellsService.getBufferCellsStatistics(bufferId);
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.getBufferCellsStatistics: Статистика получена за ${executionTime}ms`,
      );
      console.log(
        `📈 Статистика ячеек буфера ${bufferId}:`,
        JSON.stringify(result, null, 2),
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.getBufferCellsStatistics: Ошибка при получении статистики ячеек буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(':id/cells')
  @ApiOperation({ summary: 'Создать ячейку буфера' })
  @ApiParam({ name: 'id', description: 'ID буфера' })
  @ApiResponse({ status: 201, description: 'Ячейка успешно создана' })
  async createBufferCell(
    @Param('id', ParseIntPipe) bufferId: number,
    @Body() createBufferCellDto: CreateBufferCellDto,
  ): Promise<BufferCellResponse> {
    const startTime = Date.now();
    this.logger.log(
      `🆕 BuffersController.createBufferCell: Создание ячейки "${createBufferCellDto.cellCode}" для буфера ID: ${bufferId}`,
    );
    console.log(
      '📝 Данные ячейки:',
      JSON.stringify(createBufferCellDto, null, 2),
    );

    try {
      const result = await this.bufferCellsService.createBufferCell(
        bufferId,
        createBufferCellDto,
      );
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.createBufferCell: Ячейка "${result.cellCode}" создана с ID: ${result.cellId} за ${executionTime}ms`,
      );
      console.log(`🎉 Создана ячейка:`, {
        id: result.cellId,
        code: result.cellCode,
        status: result.status,
        capacity: result.capacity,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.createBufferCell: Ошибка при создании ячейки для буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Put('cells/:cellId')
  @ApiOperation({ summary: 'Обновить ячейку буфера' })
  @ApiParam({ name: 'cellId', description: 'ID ячейки' })
  @ApiResponse({ status: 200, description: 'Ячейка успешно обновлена' })
  async updateBufferCell(
    @Param('cellId', ParseIntPipe) cellId: number,
    @Body() updateBufferCellDto: UpdateBufferCellDto,
  ): Promise<BufferCellResponse> {
    const startTime = Date.now();
    this.logger.log(
      `✏️ BuffersController.updateBufferCell: Обновление ячейки ID: ${cellId}`,
    );
    console.log(
      '📝 Данные для обновления:',
      JSON.stringify(updateBufferCellDto, null, 2),
    );

    try {
      const result = await this.bufferCellsService.updateBufferCell(
        cellId,
        updateBufferCellDto,
      );
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.updateBufferCell: Ячейка ID: ${cellId} успешно обновлена за ${executionTime}ms`,
      );
      console.log(`🔄 Обновлена ячейка:`, {
        id: result.cellId,
        code: result.cellCode,
        status: result.status,
        load: `${result.currentLoad}/${result.capacity}`,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.updateBufferCell: Ошибка при обновлении ячейки ID: ${cellId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete('cells/:cellId')
  @ApiOperation({ summary: 'Удалить ячейку буфера' })
  @ApiParam({ name: 'cellId', description: 'ID ячейки' })
  @ApiResponse({ status: 200, description: 'Ячейка успешно удалена' })
  @HttpCode(HttpStatus.OK)
  async deleteBufferCell(@Param('cellId', ParseIntPipe) cellId: number) {
    const startTime = Date.now();
    this.logger.log(
      `🗑️ BuffersController.deleteBufferCell: Удаление ячейки ID: ${cellId}`,
    );

    try {
      const result = await this.bufferCellsService.deleteBufferCell(cellId);
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.deleteBufferCell: Ячейка ID: ${cellId} успешно удалена за ${executionTime}ms`,
      );
      console.log(`🗑️ Удалена ячейка ID: ${cellId}`);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.deleteBufferCell: Ошибка при удалении ячейки ID: ${cellId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // ================================
  // Операции со связями буфера и этапов
  // ================================

  @Get(':id/stages')
  @ApiOperation({ summary: 'Получить связи буфера с этапами' })
  @ApiParam({ name: 'id', description: 'ID буфера' })
  @ApiResponse({ status: 200, description: 'Связи с этапами получены' })
  async getBufferStages(
    @Param('id', ParseIntPipe) bufferId: number,
  ): Promise<BufferStageResponse[]> {
    const startTime = Date.now();
    this.logger.log(
      `🔍 BuffersController.getBufferStages: Получение связей с этапами для буфера ID: ${bufferId}`,
    );

    try {
      const result = await this.bufferStagesService.getBufferStages(bufferId);
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.getBufferStages: Получено ${result.length} связей с этапами для буфера ID: ${bufferId} за ${executionTime}ms`,
      );
      console.log(
        `📊 Связи буфера ${bufferId} с этапами:`,
        result.map((s) => ({
          stageId: s.stageId,
          stageName: s.stage.stageName,
        })),
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.getBufferStages: Ошибка при получении связей с этапами буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(':id/stages')
  @ApiOperation({ summary: 'Добавить связь буфера с этапом' })
  @ApiParam({ name: 'id', description: 'ID буфера' })
  @ApiResponse({ status: 201, description: 'Связь успешно создана' })
  async createBufferStage(
    @Param('id', ParseIntPipe) bufferId: number,
    @Body() createBufferStageDto: CreateBufferStageDto,
  ): Promise<BufferStageResponse> {
    const startTime = Date.now();
    this.logger.log(
      `🆕 BuffersController.createBufferStage: Создание связи буфера ID: ${bufferId} с этапом ID: ${createBufferStageDto.stageId}`,
    );

    try {
      const result = await this.bufferStagesService.createBufferStage(
        bufferId,
        createBufferStageDto,
      );
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.createBufferStage: Связь создана с ID: ${result.bufferStageId} за ${executionTime}ms`,
      );
      console.log(`🎉 Создана связь:`, {
        bufferStageId: result.bufferStageId,
        bufferId: result.bufferId,
        stageId: result.stageId,
        stageName: result.stage.stageName,
      });

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.createBufferStage: Ошибка при создании связи буфера ID: ${bufferId} с этапом ID: ${createBufferStageDto.stageId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Put(':id/stages')
  @ApiOperation({ summary: 'Обновить связи буфера с этапами' })
  @ApiParam({ name: 'id', description: 'ID буфера' })
  @ApiResponse({ status: 200, description: 'Связи успешно обновлены' })
  async updateBufferStages(
    @Param('id', ParseIntPipe) bufferId: number,
    @Body() updateBufferStagesDto: UpdateBufferStagesDto,
  ): Promise<BufferStageResponse[]> {
    const startTime = Date.now();
    this.logger.log(
      `✏️ BuffersController.updateBufferStages: Обновление связей буфера ID: ${bufferId} с этапами: [${updateBufferStagesDto.stageIds.join(', ')}]`,
    );

    try {
      const result = await this.bufferStagesService.updateBufferStages(
        bufferId,
        updateBufferStagesDto,
      );
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.updateBufferStages: Связи буфера ID: ${bufferId} обновлены (${result.length} связей) за ${executionTime}ms`,
      );
      console.log(
        `🔄 Обновлены связи буфера ${bufferId}:`,
        result.map((s) => ({
          stageId: s.stageId,
          stageName: s.stage.stageName,
        })),
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.updateBufferStages: Ошибка при обновлении связей буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete('stages/:bufferStageId')
  @ApiOperation({ summary: 'Удалить связь буфера с этапом' })
  @ApiParam({ name: 'bufferStageId', description: 'ID связи буфер-этап' })
  @ApiResponse({ status: 200, description: 'Связь успешно удалена' })
  @HttpCode(HttpStatus.OK)
  async deleteBufferStage(
    @Param('bufferStageId', ParseIntPipe) bufferStageId: number,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `🗑️ BuffersController.deleteBufferStage: Удаление связи ID: ${bufferStageId}`,
    );

    try {
      const result =
        await this.bufferStagesService.deleteBufferStage(bufferStageId);
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.deleteBufferStage: Связь ID: ${bufferStageId} успешно удалена за ${executionTime}ms`,
      );
      console.log(`🗑️ Удалена связь буфер-этап ID: ${bufferStageId}`);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.deleteBufferStage: Ошибка при удалении связи ID: ${bufferStageId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // ================================
  // Дополнительные операции
  // ================================

  @Get('stages/available')
  @ApiOperation({ summary: 'Получить доступные этапы для буферов' })
  @ApiResponse({ status: 200, description: 'Доступные этапы получены' })
  async getAvailableStages() {
    const startTime = Date.now();
    this.logger.log(
      '🔍 BuffersController.getAvailableStages: Получение доступных этапов',
    );

    try {
      const result = await this.bufferStagesService.getAvailableStages();
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.getAvailableStages: Получено ${result.length} доступных этапов за ${executionTime}ms`,
      );
      console.log(
        '📊 Доступные этапы:',
        result.map((s) => ({ id: s.stageId, name: s.stageName })),
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.getAvailableStages: Ошибка при получении доступных этапов за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('stages/with-buffers')
  @ApiOperation({
    summary: 'Получить этапы с информацией о привязанных буферах',
  })
  @ApiResponse({ status: 200, description: 'Этапы с буферами получены' })
  async getStagesWithBuffers(): Promise<StagesWithBuffersResponse[]> {
    const startTime = Date.now();
    this.logger.log(
      '🔍 BuffersController.getStagesWithBuffers: Получение этапов с информацией о буферах',
    );

    try {
      const result = await this.bufferStagesService.getStagesWithBuffers();
      const executionTime = Date.now() - startTime;

      this.logger.log(
        `✅ BuffersController.getStagesWithBuffers: Получено ${result.length} этапов с информацией о буферах за ${executionTime}ms`,
      );
      console.log(
        '📊 Этапы с буферами:',
        result.map((s) => ({
          id: s.stageId,
          name: s.stageName,
          buffersCount: s.buffersCount,
        })),
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `❌ BuffersController.getStagesWithBuffers: Ошибка при получении этапов с информацией о буферах за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }
}
