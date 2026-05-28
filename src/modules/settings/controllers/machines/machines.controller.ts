import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  HttpStatus,
  HttpException,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import {
  IsString,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsOptional,
  Min,
  MaxLength,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { MachinesService } from '../../services/machines/machines.service';
import { ProductionType } from '@prisma/client';

// DTO для создания станка с валидацией
export class CreateMachineDto {
  @IsString({ message: 'Название станка должно быть строкой' })
  @MaxLength(100, {
    message: 'Название станка не должно превышать 100 символов',
  })
  machineName: string;

  @IsEnum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'BROKEN'], {
    message: 'Статeс должен быть ACTIVE, BROKEN, INACTIVE или MAINTENANCE',
  })
  status: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'BROKEN';

  @IsNumber({}, { message: 'Рекомендуемая нагрузка должна быть числом' })
  @Min(0, { message: 'Рекомендуемая нагрузка не может быть отрицательной' })
  @Transform(({ value }) => parseFloat(value))
  recommendedLoad: number;

  @IsString({ message: 'Единица измерения нагрузки должна быть строкой' })
  @MaxLength(20, {
    message: 'Единица измерения не должна превышать 20 символов',
  })
  loadUnit: string;

  @IsBoolean({ message: 'Изменяемость задач должна быть булевым значением' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  noSmenTask: boolean;

  @IsOptional()
  @IsEnum(ProductionType, { message: 'Некорректный тип производства' })
  productionType?: ProductionType;
}

// DTO для обновления станка с валидацией
export class UpdateMachineDto {
  @IsOptional()
  @IsString({ message: 'Название станка должно быть строкой' })
  @MaxLength(100, {
    message: 'Название станка не должно превышать 100 символов',
  })
  machineName?: string;

  @IsOptional()
  @IsEnum(['ACTIVE', 'INACTIVE', 'MAINTENANCE', 'BROKEN'], {
    message: 'Статус должен быть ACTIVE, BROKEN, INACTIVE или MAINTENANCE',
  })
  status?: 'ACTIVE' | 'INACTIVE' | 'MAINTENANCE' | 'BROKEN';

  @IsOptional()
  @IsNumber({}, { message: 'Рекомендуемая нагрузка должна быть числом' })
  @Min(0, { message: 'Рекомендуемая нагрузка не может быть отрицательной' })
  @Transform(({ value }) => parseFloat(value))
  recommendedLoad?: number;

  @IsOptional()
  @IsString({ message: 'Единица измерения нагрузки должна быть строкой' })
  @MaxLength(20, {
    message: 'Единица измерения не должна превышать 20 символов',
  })
  loadUnit?: string;

  @IsOptional()
  @IsBoolean({ message: 'Изменяемость задач должна быть булевым значением' })
  @Transform(({ value }) => {
    if (typeof value === 'string') {
      return value.toLowerCase() === 'true';
    }
    return Boolean(value);
  })
  noSmenTask?: boolean;

  @IsOptional()
  @IsEnum(ProductionType, { message: 'Некорректный тип производства' })
  productionType?: ProductionType;
}

// DTO для управления связями с этапами
export class MachineStageDto {
  @IsNumber({}, { message: 'ID этапа должно быть числом' })
  @Transform(({ value }) => parseInt(value))
  stageId: number;
}

export class MachineSubstageDto {
  @IsNumber({}, { message: 'ID подэтапа должно быть числом' })
  @Transform(({ value }) => parseInt(value))
  substageId: number;
}

@Controller('machines')
@UsePipes(
  new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
    transformOptions: {
      enableImplicitConversion: true,
    },
    exceptionFactory: (errors) => {
      const messages = errors.map((error) => {
        const constraints = Object.values(error.constraints || {});
        return constraints.join(', ');
      });
      return new HttpException(
        {
          message: 'Ошибка валидации данных',
          errors: messages,
        },
        HttpStatus.BAD_REQUEST,
      );
    },
  }),
)
export class MachinesController {
  constructor(private readonly machinesService: MachinesService) {
    console.log('🎮 MachinesController: Контроллер инициализирован');
  }

  // Получить все станки
  @Get()
  async findAll() {
    console.log('🌐 GET /machines - Запрос всех станков');

    try {
      const startTime = Date.now();
      const result = await this.machinesService.findAll();
      const duration = Date.now() - startTime;

      console.log(
        `✅ GET /machines - Успешно получено ${result.length} станков за ${duration}ms`,
      );
      return result;
    } catch (error) {
      console.error(
        '❌ GET /machines - Ошибка при получении списка станков:',
        error,
      );
      throw new HttpException(
        'Ошибка при получении списка станков',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // НОВЫЙ ЭНДПОИНТ: Получить все этапы с подэтапами для выпадающих списков
  @Get('available/stages-with-substages')
  async getAllStagesWithSubstages() {
    console.log(
      '🌐 GET /machines/available/stages-with-substages - Запрос этапов с подэтапами',
    );

    try {
      const startTime = Date.now();
      const result = await this.machinesService.getAllStagesWithSubstages();
      const duration = Date.now() - startTime;

      console.log(
        `✅ GET /machines/available/stages-with-substages - Успешно получено ${result.length} этапов за ${duration}ms`,
      );
      return result;
    } catch (error) {
      console.error(
        '❌ GET /machines/available/stages-with-substages - Ошибка при получении этапов с подэтапами:',
        error,
      );
      throw new HttpException(
        'Ошибка при получении этапов с подэтапами',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // НОВЫЙ ЭНДПОИНТ: Получить все подэтапы сгруппированные по этапам
  @Get('available/substages-grouped')
  async getAllSubstagesGrouped() {
    console.log(
      '🌐 GET /machines/available/substages-grouped - Запрос сгруппированных подэтапов',
    );

    try {
      const startTime = Date.now();
      const result = await this.machinesService.getAllSubstagesGrouped();
      const duration = Date.now() - startTime;

      console.log(
        `✅ GET /machines/available/substages-grouped - Успешно получено ${result.length} подэтапов за ${duration}ms`,
      );
      return result;
    } catch (error) {
      console.error(
        '❌ GET /machines/available/substages-grouped - Ошибка при получении подэтапов:',
        error,
      );
      throw new HttpException(
        'Ошибка при получении подэтапов',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // НОВЫЙ ЭНДПОИНТ: Получить статистику этапов и подэтапов
  @Get('statistics/stages')
  async getStagesStatistics() {
    console.log(
      '🌐 GET /machines/statistics/stages - Запрос статистики этапов',
    );

    try {
      const startTime = Date.now();
      const result = await this.machinesService.getStagesStatistics();
      const duration = Date.now() - startTime;

      console.log(
        `✅ GET /machines/statistics/stages - Успешно получена статистика за ${duration}ms:`,
        JSON.stringify(result, null, 2),
      );
      return result;
    } catch (error) {
      console.error(
        '❌ GET /machines/statistics/stages - Ошибка при получении статистики:',
        error,
      );
      throw new HttpException(
        'Ошибка при получении статистики',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Получить доступные этапы для привязки к станку
  @Get('available/stages')
  async getAvailableStages() {
    console.log('🌐 GET /machines/available/stages - Запрос доступных этапов');

    try {
      const startTime = Date.now();
      const result = await this.machinesService.getAvailableStages();
      const duration = Date.now() - startTime;

      console.log(
        `✅ GET /machines/available/stages - Успешно получено ${result.length} доступных этапов за ${duration}ms`,
      );
      return result;
    } catch (error) {
      console.error(
        '❌ GET /machines/available/stages - Ошибка при получении доступных этапов:',
        error,
      );
      throw new HttpException(
        'Ошибка при получении доступных этапов',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Получить доступные подэтапы для конкретного этапа
  @Get('available/substages/:stageId')
  async getAvailableSubstages(@Param('stageId', ParseIntPipe) stageId: number) {
    console.log(
      `🌐 GET /machines/available/substages/${stageId} - Запрос подэтапов для этапа ${stageId}`,
    );

    try {
      const startTime = Date.now();
      const result = await this.machinesService.getAvailableSubstages(stageId);
      const duration = Date.now() - startTime;

      console.log(
        `✅ GET /machines/available/substages/${stageId} - Успешно получено ${result.length} подэтапов за ${duration}ms`,
      );
      return result;
    } catch (error) {
      console.error(
        `❌ GET /machines/available/substages/${stageId} - Ошибка при получении доступных подэтапов:`,
        error,
      );
      throw new HttpException(
        'Ошибка при получении доступных подэтапов',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Получить станок по ID
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    console.log(`🌐 GET /machines/${id} - Запрос станка по ID ${id}`);

    try {
      const startTime = Date.now();
      const machine = await this.machinesService.findOne(id);
      const duration = Date.now() - startTime;

      if (!machine) {
        console.log(`⚠️ GET /machines/${id} - Станок не найден`);
        throw new HttpException('Станок не найден', HttpStatus.NOT_FOUND);
      }

      console.log(
        `✅ GET /machines/${id} - Успешно найден станок "${machine.machineName}" за ${duration}ms`,
      );
      return machine;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error(
        `❌ GET /machines/${id} - Ошибка при получении станка:`,
        error,
      );
      throw new HttpException(
        'Ошибка при получении станка',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  // Создать новый станок
  @Post()
  async create(@Body() createMachineDto: CreateMachineDto) {
    console.log('🌐 POST /machines - Создание нового станка');
    console.log(
      '📝 Данные для создания:',
      JSON.stringify(createMachineDto, null, 2),
    );

    try {
      const startTime = Date.now();
      const newMachine = await this.machinesService.create(createMachineDto);
      const duration = Date.now() - startTime;

      console.log(
        `✅ POST /machines - Успешно создан станок "${newMachine.machineName}" (ID: ${newMachine.machineId}) за ${duration}ms`,
      );

      return newMachine;
    } catch (error) {
      console.error('❌ POST /machines - Ошибка при создании станка:', error);
      throw new HttpException(
        error.message || 'Ошибка при создании станка',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Обновить станок
  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMachineDto: UpdateMachineDto,
  ) {
    console.log(`🌐 PUT /machines/${id} - Обновление станка ID ${id}`);
    console.log(
      '📝 Данные для обновления:',
      JSON.stringify(updateMachineDto, null, 2),
    );

    try {
      const startTime = Date.now();
      const updatedMachine = await this.machinesService.update(
        id,
        updateMachineDto,
      );
      const duration = Date.now() - startTime;

      if (!updatedMachine) {
        console.log(`⚠️ PUT /machines/${id} - Станок не найден`);
        throw new HttpException('Станок не найден', HttpStatus.NOT_FOUND);
      }

      console.log(
        `✅ PUT /machines/${id} - Успешно обновлен станок "${updatedMachine.machineName}" за ${duration}ms`,
      );

      return updatedMachine;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error(
        `❌ PUT /machines/${id} - Ошибка при обновлении станка:`,
        error,
      );
      throw new HttpException(
        error.message || 'Ошибка при обновлении станка',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Удалить станок
  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number) {
    console.log(`🌐 DELETE /machines/${id} - Удаление станка ID ${id}`);

    try {
      const startTime = Date.now();
      const deletedMachine = await this.machinesService.remove(id);
      const duration = Date.now() - startTime;

      if (!deletedMachine) {
        console.log(`⚠️ DELETE /machines/${id} - Станок не найден`);
        throw new HttpException('Станок не найден', HttpStatus.NOT_FOUND);
      }

      console.log(
        `✅ DELETE /machines/${id} - Успешно удален станок "${deletedMachine.machineName}" за ${duration}ms`,
      );

      return { message: 'Станок успешно удален' };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      console.error(
        `❌ DELETE /machines/${id} - Ошибка при удалении станка:`,
        error,
      );
      throw new HttpException(
        error.message || 'Ошибка при удалении станка',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Добавить связь с этапом 1-го уровня
  @Post(':id/stages')
  async addStage(
    @Param('id', ParseIntPipe) machineId: number,
    @Body() machineStageDto: MachineStageDto,
  ) {
    console.log(
      `🌐 POST /machines/${machineId}/stages - Добавление связи станка ${machineId} с этапом ${machineStageDto.stageId}`,
    );
    console.log('📝 Данные запроса:', JSON.stringify(machineStageDto, null, 2));

    try {
      const startTime = Date.now();
      const result = await this.machinesService.addStage(
        machineId,
        machineStageDto.stageId,
      );
      const duration = Date.now() - startTime;

      console.log(
        `✅ POST /machines/${machineId}/stages - Успешно добавлена связь за ${duration}ms`,
      );

      // Уведомляем через WebSocket
      console.log(
        '📡 Отправка WebSocket уведомления о добавлении связи с этапом',
      );

      return result;
    } catch (error) {
      console.error(
        `❌ POST /machines/${machineId}/stages - Ошибка при добавлении связи с этапом:`,
        error,
      );
      throw new HttpException(
        error.message || 'Ошибка при добавлении связи с этапом',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Удалить связь с этапом 1-го уровня
  @Delete(':id/stages/:stageId')
  async removeStage(
    @Param('id', ParseIntPipe) machineId: number,
    @Param('stageId', ParseIntPipe) stageId: number,
  ) {
    console.log(
      `🌐 DELETE /machines/${machineId}/stages/${stageId} - Удаление связи станка ${machineId} с этапом ${stageId}`,
    );

    try {
      const startTime = Date.now();
      await this.machinesService.removeStage(machineId, stageId);
      const duration = Date.now() - startTime;

      console.log(
        `✅ DELETE /machines/${machineId}/stages/${stageId} - Успешно удалена связь за ${duration}ms`,
      );

      // Уведомляем через WebSocket
      console.log(
        '📡 Отправка WebSocket уведомления об удалении связи с этапом',
      );

      return { message: 'Связь с этапом успешно удалена' };
    } catch (error) {
      console.error(
        `❌ DELETE /machines/${machineId}/stages/${stageId} - Ошибка при удалении связи с этапом:`,
        error,
      );
      throw new HttpException(
        error.message || 'Ошибка при удалении связи с этапом',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Добавить связь с подэтапом 2-го уровня
  @Post(':id/substages')
  async addSubstage(
    @Param('id', ParseIntPipe) machineId: number,
    @Body() machineSubstageDto: MachineSubstageDto,
  ) {
    console.log(
      `🌐 POST /machines/${machineId}/substages - Добавление связи станка ${machineId} с подэтапом ${machineSubstageDto.substageId}`,
    );
    console.log(
      '📝 Данные запроса:',
      JSON.stringify(machineSubstageDto, null, 2),
    );

    try {
      const startTime = Date.now();
      const result = await this.machinesService.addSubstage(
        machineId,
        machineSubstageDto.substageId,
      );
      const duration = Date.now() - startTime;

      console.log(
        `✅ POST /machines/${machineId}/substages - Успешно добавлена связь за ${duration}ms`,
      );

      // Уведомляем через WebSocket
      console.log(
        '📡 Отправка WebSocket уведомления о добавлении связи с подэтапом',
      );

      return result;
    } catch (error) {
      console.error(
        `❌ POST /machines/${machineId}/substages - Ошибка при добавлении связи с подэтапом:`,
        error,
      );
      throw new HttpException(
        error.message || 'Ошибка при добавлении связи с подэтапом',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Удалить связь с подэтапом 2-го уровня
  @Delete(':id/substages/:substageId')
  async removeSubstage(
    @Param('id', ParseIntPipe) machineId: number,
    @Param('substageId', ParseIntPipe) substageId: number,
  ) {
    console.log(
      `🌐 DELETE /machines/${machineId}/substages/${substageId} - Удаление связи станка ${machineId} с подэтапом ${substageId}`,
    );

    try {
      const startTime = Date.now();
      await this.machinesService.removeSubstage(machineId, substageId);
      const duration = Date.now() - startTime;

      console.log(
        `✅ DELETE /machines/${machineId}/substages/${substageId} - Успешно удалена связь за ${duration}ms`,
      );

      // Уведомляем через WebSocket
      console.log(
        '📡 Отправка WebSocket уведомления об удалении связи с подэтапом',
      );

      return { message: 'Связь с подэтапом успешно удалена' };
    } catch (error) {
      console.error(
        `❌ DELETE /machines/${machineId}/substages/${substageId} - Ошибка при удалении связи с подэтапом:`,
        error,
      );
      throw new HttpException(
        error.message || 'Ошибка при удалении связи с подэтапом',
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // Получить все этапы и подэтапы для станка
  @Get(':id/stages')
  async getMachineStages(@Param('id', ParseIntPipe) machineId: number) {
    console.log(
      `🌐 GET /machines/${machineId}/stages - Запрос этапов для станка ${machineId}`,
    );

    try {
      const startTime = Date.now();
      const result = await this.machinesService.getMachineStages(machineId);
      const duration = Date.now() - startTime;

      console.log(
        `✅ GET /machines/${machineId}/stages - Успешно получены этапы станка за ${duration}ms`,
      );
      console.log(
        `📊 Станок "${result.machine.machineName}" имеет ${result.stages.length} связанных этапов`,
      );

      return result;
    } catch (error) {
      console.error(
        `❌ GET /machines/${machineId}/stages - Ошибка при получении этапов станка:`,
        error,
      );
      throw new HttpException(
        error.message || 'Ошибка при получении этапов станка',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
