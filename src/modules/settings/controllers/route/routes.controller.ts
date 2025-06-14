
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  UseGuards,
  Logger,
} from '@nestjs/common';
import { RoutesService } from '../../services/route/routes.service';
import { RouteStagesService } from '../../services/route/route-stages.service';
import {
  CreateRouteDto,
  UpdateRouteDto,
  CreateRouteStageDto,
  UpdateRouteStageDto,
  ReorderRouteStagesDto,
  MoveRouteStageDto,
  CopyRouteDto,
} from '../../dto/route/routes.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';

@ApiTags('Маршруты')
@Controller('settings/routes')
export class RoutesController {
  private readonly logger = new Logger(RoutesController.name);

  constructor(
    private readonly routesService: RoutesService,
    private readonly routeStagesService: RouteStagesService,
  ) {}

  // ================================
  // CRUD операции для маршрутов
  // ================================

  @Get()
  @ApiOperation({ summary: 'Получить все маршруты' })
  @ApiResponse({ status: 200, description: 'Список всех маршрутов' })
  async getAllRoutes() {
    const startTime = Date.now();
    this.logger.log(
      'GET /settings/routes - Запрос на получение всех маршрутов',
    );

    try {
      const result = await this.routesService.getAllRoutes();
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `GET /settings/routes - Успешно возвращено ${result.length} маршрутов за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `GET /settings/routes - Ошибка при получении маршрутов за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить маршрут по ID' })
  @ApiParam({ name: 'id', description: 'ID маршрута' })
  @ApiResponse({ status: 200, description: 'Данные маршрута' })
  @ApiResponse({ status: 404, description: 'Маршрут не найден' })
  async getRouteById(@Param('id', ParseIntPipe) id: number) {
    const startTime = Date.now();
    this.logger.log(
      `GET /settings/routes/${id} - Запрос на получение маршрута с ID: ${id}`,
    );

    try {
      const result = await this.routesService.getRouteById(id);
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `GET /settings/routes/${id} - Успешно возвращен маршрут "${result.routeName}" за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `GET /settings/routes/${id} - Ошибка при получении маршрута за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Post()
  @ApiOperation({ summary: 'Создать новый маршрут' })
  @ApiResponse({ status: 201, description: 'Маршрут успешно создан' })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  async createRoute(@Body() createRouteDto: CreateRouteDto) {
    const startTime = Date.now();
    this.logger.log(
      `POST /settings/routes - Запрос на создание маршрута: ${JSON.stringify(createRouteDto)}`,
    );

    try {
      const result = await this.routesService.createRoute(createRouteDto);
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `POST /settings/routes - Успешно создан маршрут "${result.routeName}" с ID: ${result.routeId} за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `POST /settings/routes - Ошибка при создании маршрута "${createRouteDto.routeName}" за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Put(':id')
  @ApiOperation({ summary: 'Обновить маршрут' })
  @ApiParam({ name: 'id', description: 'ID маршрута' })
  @ApiResponse({ status: 200, description: 'Маршрут успешно обновлен' })
  @ApiResponse({ status: 404, description: 'Маршрут не найден' })
  async updateRoute(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateRouteDto: UpdateRouteDto,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `PUT /settings/routes/${id} - Запрос на обновление маршрута: ${JSON.stringify(updateRouteDto)}`,
    );

    try {
      const result = await this.routesService.updateRoute(id, updateRouteDto);
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `PUT /settings/routes/${id} - Успешно обновлен маршрут "${result.routeName}" за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `PUT /settings/routes/${id} - Ошибка при обновлении маршрута за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить маршрут' })
  @ApiParam({ name: 'id', description: 'ID маршрута' })
  @ApiResponse({ status: 200, description: 'Маршрут успешно удален' })
  @ApiResponse({ status: 404, description: 'Маршрут не найден' })
  @ApiResponse({
    status: 400,
    description: 'Маршрут используется и не может быть удален',
  })
  async deleteRoute(@Param('id', ParseIntPipe) id: number) {
    const startTime = Date.now();
    this.logger.log(
      `DELETE /settings/routes/${id} - Запрос на удаление маршрута с ID: ${id}`,
    );

    try {
      const result = await this.routesService.deleteRoute(id);
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `DELETE /settings/routes/${id} - Успешно удален маршрут за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `DELETE /settings/routes/${id} - Ошибка при удалении маршрута за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // ================================
  // CRUD операции для этапов маршрута
  // ================================

  @Get(':id/stages')
  @ApiOperation({ summary: 'Получить этапы маршрута' })
  @ApiParam({ name: 'id', description: 'ID маршрута' })
  @ApiResponse({ status: 200, description: 'Список этапов маршрута' })
  @ApiResponse({ status: 404, description: 'Маршрут не найден' })
  async getRouteStages(@Param('id', ParseIntPipe) id: number) {
    const startTime = Date.now();
    this.logger.log(
      `GET /settings/routes/${id}/stages - Запрос на получение этапов маршрута с ID: ${id}`,
    );

    try {
      const result = await this.routeStagesService.getRouteStages(id);
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `GET /settings/routes/${id}/stages - Успешно возвращено ${result.length} этапов за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `GET /settings/routes/${id}/stages - Ошибка при получении этапов маршрута за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(':id/stages')
  @ApiOperation({ summary: 'Добавить этап к маршруту' })
  @ApiParam({ name: 'id', description: 'ID маршрута' })
  @ApiResponse({ status: 201, description: 'Этап успешно добавлен' })
  @ApiResponse({ status: 404, description: 'Маршрут не найден' })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  async createRouteStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() createRouteStageDto: CreateRouteStageDto,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `POST /settings/routes/${id}/stages - Запрос на создание этапа: ${JSON.stringify(createRouteStageDto)}`,
    );

    try {
      const result = await this.routeStagesService.createRouteStage(
        id,
        createRouteStageDto,
      );
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `POST /settings/routes/${id}/stages - Успешно создан этап с ID: ${result.routeStageId} за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `POST /settings/routes/${id}/stages - Ошибка при создании этапа маршрута за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Put('stages/:stageId')
  @ApiOperation({ summary: 'Обновить этап маршрута' })
  @ApiParam({ name: 'stageId', description: 'ID этапа маршрута' })
  @ApiResponse({ status: 200, description: 'Этап успешно обновлен' })
  @ApiResponse({ status: 404, description: 'Этап не найден' })
  async updateRouteStage(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() updateRouteStageDto: UpdateRouteStageDto,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `PUT /settings/routes/stages/${stageId} - Запрос на обновление этапа: ${JSON.stringify(updateRouteStageDto)}`,
    );

    try {
      const result = await this.routeStagesService.updateRouteStage(
        stageId,
        updateRouteStageDto,
      );
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `PUT /settings/routes/stages/${stageId} - Успешно обновлен этап за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `PUT /settings/routes/stages/${stageId} - Ошибка при обновлении этапа маршрута за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Delete('stages/:stageId')
  @ApiOperation({ summary: 'Удалить этап маршрута' })
  @ApiParam({ name: 'stageId', description: 'ID этапа маршрута' })
  @ApiResponse({ status: 200, description: 'Этап успешно удален' })
  @ApiResponse({ status: 404, description: 'Этап не найден' })
  @ApiResponse({
    status: 400,
    description: 'Этап используется и не может быть удален',
  })
  async deleteRouteStage(@Param('stageId', ParseIntPipe) stageId: number) {
    const startTime = Date.now();
    this.logger.log(
      `DELETE /settings/routes/stages/${stageId} - Запрос на удаление этапа с ID: ${stageId}`,
    );

    try {
      const result = await this.routeStagesService.deleteRouteStage(stageId);
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `DELETE /settings/routes/stages/${stageId} - Успешно удален этап за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `DELETE /settings/routes/stages/${stageId} - Ошибка при удалении этапа маршрута за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // ================================
  // Управление п��следовательностью этапов
  // ================================

  @Put(':id/stages/reorder')
  @ApiOperation({ summary: 'Изменить порядок этапов в маршруте' })
  @ApiParam({ name: 'id', description: 'ID маршрута' })
  @ApiResponse({ status: 200, description: 'Порядок этапов успешно изменен' })
  @ApiResponse({ status: 404, description: 'Маршрут не найден' })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  async reorderRouteStages(
    @Param('id', ParseIntPipe) id: number,
    @Body() reorderDto: ReorderRouteStagesDto,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `PUT /settings/routes/${id}/stages/reorder - Запрос на изменение порядка этапов: ${JSON.stringify(reorderDto)}`,
    );

    try {
      const result = await this.routeStagesService.reorderRouteStages(
        id,
        reorderDto,
      );
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `PUT /settings/routes/${id}/stages/reorder - Успешно изменен порядок ${result.length} этапов за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `PUT /settings/routes/${id}/stages/reorder - Ошибка при изменении порядка этапов за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Put('stages/:stageId/move')
  @ApiOperation({ summary: 'Переместить этап на новую позицию' })
  @ApiParam({ name: 'stageId', description: 'ID этапа маршрута' })
  @ApiResponse({ status: 200, description: 'Этап успешно перемещен' })
  @ApiResponse({ status: 404, description: 'Этап не найден' })
  async moveRouteStage(
    @Param('stageId', ParseIntPipe) stageId: number,
    @Body() moveDto: MoveRouteStageDto,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `PUT /settings/routes/stages/${stageId}/move - Запрос на перемещение этапа на позицию: ${moveDto.newSequenceNumber}`,
    );

    try {
      const result = await this.routeStagesService.moveRouteStage(
        stageId,
        moveDto.newSequenceNumber,
      );
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `PUT /settings/routes/stages/${stageId}/move - Успешно перемещен этап за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `PUT /settings/routes/stages/${stageId}/move - Ошибка при перемещении ��тапа за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // ================================
  // Вспомогательные методы
  // ================================

  @Get('available-stages/level1')
  @ApiOperation({ summary: 'Получить доступные этапы уровня 1' })
  @ApiResponse({ status: 200, description: 'Список доступных этапов уровня 1' })
  async getAvailableStagesLevel1() {
    const startTime = Date.now();
    this.logger.log(
      'GET /settings/routes/available-stages/level1 - Запрос на получение доступных этапов уровня 1',
    );

    try {
      const result = await this.routeStagesService.getAvailableStagesLevel1();
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `GET /settings/routes/available-stages/level1 - Успешно возвращено ${result.length} этапов уровня 1 за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `GET /settings/routes/available-stages/level1 - Ошибка при получении доступных этапов уровня 1 за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Get('available-stages/level2/:stageId')
  @ApiOperation({
    summary: 'Получить доступные этапы уровня 2 для этапа уровня 1',
  })
  @ApiParam({ name: 'stageId', description: 'ID этапа уровня 1' })
  @ApiResponse({ status: 200, description: 'Список доступных этапов уровня 2' })
  async getAvailableStagesLevel2(
    @Param('stageId', ParseIntPipe) stageId: number,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `GET /settings/routes/available-stages/level2/${stageId} - Запрос на получение доступных этапов уровня 2 для этапа: ${stageId}`,
    );

    try {
      const result = await this.routeStagesService.getAvailableStagesLevel2(stageId);
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `GET /settings/routes/available-stages/level2/${stageId} - Успешно возвращено ${result.length} этапов уровня 2 за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `GET /settings/routes/available-stages/level2/${stageId} - Ошибка при получении доступных этапов уровня 2 за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  @Post(':id/copy')
  @ApiOperation({ summary: 'Скопировать маршрут' })
  @ApiParam({ name: 'id', description: 'ID маршрута для копирования' })
  @ApiResponse({ status: 201, description: 'Маршрут успешно скопирован' })
  @ApiResponse({ status: 404, description: 'Маршрут не найден' })
  async copyRoute(
    @Param('id', ParseIntPipe) id: number,
    @Body() copyDto: CopyRouteDto,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `POST /settings/routes/${id}/copy - Запрос на копирование маршрута с новым названием: "${copyDto.newRouteName}"`,
    );

    try {
      const result = await this.routesService.copyRoute(
        id,
        copyDto.newRouteName,
      );
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `POST /settings/routes/${id}/copy - Успешно скопирован маршрут с новым ID: ${result.routeId} за ${executionTime}ms`,
      );
      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `POST /settings/routes/${id}/copy - Ошибка при копировании маршрута за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }
}
