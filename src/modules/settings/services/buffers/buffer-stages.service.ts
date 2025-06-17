import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import {
  CreateBufferStageDto,
  UpdateBufferStagesDto,
  BufferStageResponse,
  StagesWithBuffersResponse,
} from '../../dto/buffers/buffers.dto';
import { EventsService } from '../../../websocket/services/events.service';

@Injectable()
export class BufferStagesService {
  private readonly logger = new Logger(BufferStagesService.name);

  constructor(
    private prisma: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  // ================================
  // CRUD операции для связей буфера с этапами
  // ================================

  /**
   * Получить все связи буфера с этапами
   */
  async getBufferStages(bufferId: number): Promise<BufferStageResponse[]> {
    const startTime = Date.now();
    this.logger.log(`Запрос на получение связей с этапами для буфера ID: ${bufferId}`);

    try {
      const buffer = await this.prisma.buffer.findUnique({
        where: { bufferId },
      });

      if (!buffer) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка получения связей с этапами несуществующего буфера с ID ${bufferId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Буфер с ID ${bufferId} не найден`);
      }

      const bufferStages = await this.prisma.bufferStage.findMany({
        where: { bufferId },
        include: {
          stage: true,
        },
        orderBy: {
          stage: {
            stageName: 'asc',
          },
        },
      });

      const result: BufferStageResponse[] = bufferStages.map((bufferStage) => ({
        bufferStageId: bufferStage.bufferStageId,
        bufferId: bufferStage.bufferId,
        stageId: bufferStage.stageId,
        stage: {
          stageId: bufferStage.stage.stageId,
          stageName: bufferStage.stage.stageName,
          description: bufferStage.stage.description,
        },
      }));

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Получено ${result.length} связей с этапами для буфера "${buffer.bufferName}" за ${executionTime}ms`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при получении связей с этапами буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Добавить связь буфера с этапом
   */
  async createBufferStage(
    bufferId: number,
    createBufferStageDto: CreateBufferStageDto,
  ): Promise<BufferStageResponse> {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на создание связи буфера ID: ${bufferId} с этапом ID: ${createBufferStageDto.stageId}`,
    );

    try {
      const buffer = await this.prisma.buffer.findUnique({
        where: { bufferId },
      });

      if (!buffer) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка создания связи для несуществующего буфера с ID ${bufferId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Буфер с ID ${bufferId} не найден`);
      }

      // Проверяем существование этапа
      const stage = await this.prisma.productionStageLevel1.findUnique({
        where: { stageId: createBufferStageDto.stageId },
      });

      if (!stage) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Этап с ID ${createBufferStageDto.stageId} не найден за ${executionTime}ms`,
        );
        throw new NotFoundException(
          `Этап с ID ${createBufferStageDto.stageId} не найден`,
        );
      }

      // Проверяем, не существует ли уже такая связь
      const existingBufferStage = await this.prisma.bufferStage.findFirst({
        where: {
          bufferId,
          stageId: createBufferStageDto.stageId,
        },
      });

      if (existingBufferStage) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Связь между буфером ${bufferId} и этапом ${createBufferStageDto.stageId} уже существует за ${executionTime}ms`,
        );
        throw new BadRequestException(
          'Связь между буфером и этапом уже существует',
        );
      }

      const bufferStage = await this.prisma.bufferStage.create({
        data: {
          bufferId,
          stageId: createBufferStageDto.stageId,
        },
        include: {
          stage: true,
        },
      });

      const result: BufferStageResponse = {
        bufferStageId: bufferStage.bufferStageId,
        bufferId: bufferStage.bufferId,
        stageId: bufferStage.stageId,
        stage: {
          stageId: bufferStage.stage.stageId,
          stageName: bufferStage.stage.stageName,
          description: bufferStage.stage.description,
        },
      };

      // Отправляем событие о создании связи буфера с этапом
      this.eventsService.emitToRoom('buffers', 'bufferStageCreated', {
        bufferId: bufferId,
        bufferName: buffer.bufferName,
        bufferStage: result,
        timestamp: new Date().toISOString(),
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Создана связь буфера "${buffer.bufferName}" с этапом "${stage.stageName}" (ID: ${result.bufferStageId}) за ${executionTime}ms`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Ошибка при создании связи буфера ${bufferId} с этапом ${createBufferStageDto.stageId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Удалить связь буфера с этапом
   */
  async deleteBufferStage(bufferStageId: number) {
    const startTime = Date.now();
    this.logger.log(`Запрос на удаление связи буфера с этапом ID: ${bufferStageId}`);

    try {
      const bufferStage = await this.prisma.bufferStage.findUnique({
        where: { bufferStageId },
        include: {
          buffer: true,
          stage: true,
        },
      });

      if (!bufferStage) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка удаления несуществующей связи буфера с этапом ID ${bufferStageId} за ${executionTime}ms`,
        );
        throw new NotFoundException(
          `Связь буфера с этапом ID ${bufferStageId} не найдена`,
        );
      }

      await this.prisma.bufferStage.delete({
        where: { bufferStageId },
      });

      // Отправляем событие об удалении связи буфера с этапом
      this.eventsService.emitToRoom('buffers', 'bufferStageDeleted', {
        bufferStageId: bufferStageId,
        bufferId: bufferStage.bufferId,
        bufferName: bufferStage.buffer.bufferName,
        stageId: bufferStage.stageId,
        stageName: bufferStage.stage.stageName,
        timestamp: new Date().toISOString(),
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Удалена связь буфера "${bufferStage.buffer.bufferName}" с этапом "${bufferStage.stage.stageName}" (ID: ${bufferStageId}) за ${executionTime}ms`,
      );

      return { message: 'Связь буфера с этапом успешно удалена' };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при удалении связи буфера с этапом ID: ${bufferStageId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Обновить связи буфера с этапами (заменить все связи)
   */
  async updateBufferStages(
    bufferId: number,
    updateBufferStagesDto: UpdateBufferStagesDto,
  ): Promise<BufferStageResponse[]> {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на обновление связей буфера ID: ${bufferId} с этапами: ${JSON.stringify(updateBufferStagesDto.stageIds)}`,
    );

    try {
      const buffer = await this.prisma.buffer.findUnique({
        where: { bufferId },
      });

      if (!buffer) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка обновления связей несуществующего буфера с ID ${bufferId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Буфер с ID ${bufferId} не найден`);
      }

      // Проверяем существование всех этапов
      const stages = await this.prisma.productionStageLevel1.findMany({
        where: {
          stageId: { in: updateBufferStagesDto.stageIds },
        },
      });

      if (stages.length !== updateBufferStagesDto.stageIds.length) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Некоторые этапы не найдены. Ожидалось: ${updateBufferStagesDto.stageIds.length}, найдено: ${stages.length} за ${executionTime}ms`,
        );
        throw new BadRequestException('Некоторые этапы не найдены');
      }

      // Обновляем связи в транзакции
      const result = await this.prisma.$transaction(async (prisma) => {
        // Удаляем все существующие связи
        await prisma.bufferStage.deleteMany({
          where: { bufferId },
        });

        // Создаем новые связи
        const newBufferStages: any[] = [];
        for (const stageId of updateBufferStagesDto.stageIds) {
          const bufferStage = await prisma.bufferStage.create({
            data: {
              bufferId,
              stageId,
            },
            include: {
              stage: true,
            },
          });
          newBufferStages.push(bufferStage);
        }

        return newBufferStages;
      });

      const mappedResult: BufferStageResponse[] = result.map((bufferStage: any) => ({
        bufferStageId: bufferStage.bufferStageId,
        bufferId: bufferStage.bufferId,
        stageId: bufferStage.stageId,
        stage: {
          stageId: bufferStage.stage.stageId,
          stageName: bufferStage.stage.stageName,
          description: bufferStage.stage.description,
        },
      }));

      // Отправляем событие об обновлении связей буфера с этапами
      this.eventsService.emitToRoom('buffers', 'bufferStagesUpdated', {
        bufferId: bufferId,
        bufferName: buffer.bufferName,
        bufferStages: mappedResult,
        timestamp: new Date().toISOString(),
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Успешно обновлены связи буфера "${buffer.bufferName}" с ${mappedResult.length} этапами за ${executionTime}ms`,
      );

      return mappedResult;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Ошибка при обновлении связей буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // ================================
  // Вспомогательные методы
  // ================================

  /**
   * Создать несколько связей буфера с этапами (используется в транзакциях)
   */
  async createBufferStages(
    bufferId: number,
    stageIds: number[],
    prisma: any,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `Создание связей с ${stageIds.length} этапами для буфера ID: ${bufferId}`,
    );

    try {
      for (let i = 0; i < stageIds.length; i++) {
        const stageId = stageIds[i];
        await prisma.bufferStage.create({
          data: {
            bufferId,
            stageId,
          },
        });
        this.logger.log(
          `Создана связь ${i + 1}/${stageIds.length} для буфера ID: ${bufferId}`,
        );
      }

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Успешно создано ${stageIds.length} связей с этапами для буфера ID: ${bufferId} за ${executionTime}ms`,
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Ошибка при создании связей с этапами для буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Получить доступные этапы для привязки к буферу
   */
  async getAvailableStages() {
    const startTime = Date.now();
    this.logger.log('Запрос на получение доступных этапов для буферов');

    try {
      const stages = await this.prisma.productionStageLevel1.findMany({
        include: {
          _count: {
            select: {
              bufferStages: true,
            },
          },
        },
        orderBy: {
          stageName: 'asc',
        },
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Получено ${stages.length} доступных этапов за ${executionTime}ms`,
      );

      return stages;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Ошибка при получении доступных этапов за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Получить этапы с информацией о привязанных буферах
   */
  async getStagesWithBuffers(): Promise<StagesWithBuffersResponse[]> {
    const startTime = Date.now();
    this.logger.log('Запрос на получение этапов с информацией о буферах');

    try {
      const stages = await this.prisma.productionStageLevel1.findMany({
        include: {
          bufferStages: {
            include: {
              buffer: true,
            },
          },
        },
        orderBy: {
          stageName: 'asc',
        },
      });

      const result: StagesWithBuffersResponse[] = stages.map((stage) => ({
        stageId: stage.stageId,
        stageName: stage.stageName,
        description: stage.description,
        buffersCount: stage.bufferStages.length,
        buffers: stage.bufferStages.map((bufferStage) => ({
          bufferId: bufferStage.buffer.bufferId,
          bufferName: bufferStage.buffer.bufferName,
          location: bufferStage.buffer.location,
        })),
      }));

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Получено ${result.length} этапов с информацией о буферах за ${executionTime}ms`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Ошибка при получении этапов с информацией о буферах за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }
}