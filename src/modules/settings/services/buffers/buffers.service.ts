import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import {
  CreateBufferDto,
  UpdateBufferDto,
  CopyBufferDto,
  BufferResponse,
  BufferDetailResponse,
} from '../../dto/buffers/buffers.dto';
import { EventsService } from '../../../websocket/services/events.service';
import { BufferCellsService } from './buffer-cells.service';
import { BufferStagesService } from './buffer-stages.service';

@Injectable()
export class BuffersService {
  private readonly logger = new Logger(BuffersService.name);

  constructor(
    private prisma: PrismaService,
    private readonly eventsService: EventsService,
    private readonly bufferCellsService: BufferCellsService,
    private readonly bufferStagesService: BufferStagesService,
  ) {}

  // ================================
  // CRUD операции для буферов
  // ================================

  /**
   * Получить все буферы
   */
  async getAllBuffers(): Promise<BufferResponse[]> {
    const startTime = Date.now();
    this.logger.log('Запрос на получение всех буферов');

    try {
      const buffers = await this.prisma.buffer.findMany({
        include: {
          _count: {
            select: {
              bufferCells: true,
              bufferStages: true,
            },
          },
        },
        orderBy: {
          bufferName: 'asc',
        },
      });

      const result: BufferResponse[] = buffers.map((buffer) => ({
        bufferId: buffer.bufferId,
        bufferName: buffer.bufferName,
        description: buffer.description,
        location: buffer.location,
        cellsCount: buffer._count.bufferCells,
        stagesCount: buffer._count.bufferStages,
      }));

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Успешно получено ${result.length} буферов за ${executionTime}ms`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Ошибка при получении буферов за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Получить буфер по ID
   */
  async getBufferById(bufferId: number): Promise<BufferDetailResponse> {
    const startTime = Date.now();
    this.logger.log(`Запрос на получение буфера с ID: ${bufferId}`);

    try {
      const buffer = await this.prisma.buffer.findUnique({
        where: { bufferId },
        include: {
          bufferCells: {
            orderBy: {
              cellCode: 'asc',
            },
          },
          bufferStages: {
            include: {
              stage: true,
            },
            orderBy: {
              stage: {
                stageName: 'asc',
              },
            },
          },
          _count: {
            select: {
              bufferCells: true,
              bufferStages: true,
            },
          },
        },
      });

      if (!buffer) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Буфер с ID ${bufferId} не найден за ${executionTime}ms`,
        );
        throw new NotFoundException(`Буфер с ID ${bufferId} не найден`);
      }

      const result: BufferDetailResponse = {
        bufferId: buffer.bufferId,
        bufferName: buffer.bufferName,
        description: buffer.description,
        location: buffer.location,
        cellsCount: buffer._count.bufferCells,
        stagesCount: buffer._count.bufferStages,
        bufferCells: buffer.bufferCells.map((cell) => ({
          cellId: cell.cellId,
          bufferId: cell.bufferId,
          cellCode: cell.cellCode,
          status: cell.status as any,
          capacity: Number(cell.capacity),
          currentLoad: Number(cell.currentLoad),
          createdAt: cell.createdAt,
          updatedAt: cell.updatedAt,
        })),
        bufferStages: buffer.bufferStages.map((bufferStage) => ({
          bufferStageId: bufferStage.bufferStageId,
          bufferId: bufferStage.bufferId,
          stageId: bufferStage.stageId,
          stage: {
            stageId: bufferStage.stage.stageId,
            stageName: bufferStage.stage.stageName,
            description: bufferStage.stage.description,
          },
        })),
      };

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Успешно получен буфер "${buffer.bufferName}" с ${buffer._count.bufferCells} ячейками и ${buffer._count.bufferStages} этапами за ${executionTime}ms`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при получении буфера с ID ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Создать новый буфер
   */
  async createBuffer(createBufferDto: CreateBufferDto): Promise<BufferDetailResponse> {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на создание буфера: ${JSON.stringify(createBufferDto)}`,
    );

    try {
      const { bufferName, description, location, cells, stageIds } = createBufferDto;

      // Проверяем уникальность названия буфера
      const existingBuffer = await this.prisma.buffer.findFirst({
        where: { bufferName },
      });

      if (existingBuffer) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Буфер с названием "${bufferName}" уже существует за ${executionTime}ms`,
        );
        throw new BadRequestException(
          `Буфер с названием "${bufferName}" уже существует`,
        );
      }

      // Создаем буфер и связанные данные в транзакции
      const createdBufferId = await this.prisma.$transaction(async (prisma) => {
        // Создаем буфер
        const buffer = await prisma.buffer.create({
          data: {
            bufferName,
            description,
            location,
          },
        });

        this.logger.log(
          `Создан буфер с ID: ${buffer.bufferId}, название: "${bufferName}"`,
        );

        // Если переданы ячейки, создаем их
        if (cells && cells.length > 0) {
          this.logger.log(`Создание ${cells.length} ячеек для буфера`);
          await this.bufferCellsService.createBufferCells(buffer.bufferId, cells, prisma);
        }

        // Если переданы этапы, создаем связи
        if (stageIds && stageIds.length > 0) {
          this.logger.log(`Создание связей с ${stageIds.length} этапами для буфера`);
          await this.bufferStagesService.createBufferStages(buffer.bufferId, stageIds, prisma);
        }

        return buffer.bufferId;
      });

      // Получаем созданный буфер со всеми связанными данными
      const newBuffer = await this.getBufferById(createdBufferId);

      // Отправляем событие о создании буфера
      this.eventsService.emitToRoom('buffers', 'bufferCreated', {
        buffer: newBuffer,
        timestamp: new Date().toISOString(),
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Буфер "${newBuffer.bufferName}" успешно создан с ID: ${newBuffer.bufferId} за ${executionTime}ms`,
      );

      return newBuffer;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Ошибка при создании буфера "${createBufferDto.bufferName}" за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Обновить буфер
   */
  async updateBuffer(bufferId: number, updateBufferDto: UpdateBufferDto): Promise<BufferDetailResponse> {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на обновление буфера ID: ${bufferId}, данные: ${JSON.stringify(updateBufferDto)}`,
    );

    try {
      const buffer = await this.prisma.buffer.findUnique({
        where: { bufferId },
      });

      if (!buffer) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка обновления несуществующего буфера с ID ${bufferId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Буфер с ID ${bufferId} не найден`);
      }

      const oldName = buffer.bufferName;
      const oldLocation = buffer.location;

      // Проверяем уникальность нового названия, если оно изменяется
      if (updateBufferDto.bufferName && updateBufferDto.bufferName !== oldName) {
        const existingBuffer = await this.prisma.buffer.findFirst({
          where: { 
            bufferName: updateBufferDto.bufferName,
            NOT: { bufferId },
          },
        });

        if (existingBuffer) {
          const executionTime = Date.now() - startTime;
          this.logger.warn(
            `Буфер с названием "${updateBufferDto.bufferName}" уже существует за ${executionTime}ms`,
          );
          throw new BadRequestException(
            `Буфер с названием "${updateBufferDto.bufferName}" уже существует`,
          );
        }
      }

      await this.prisma.buffer.update({
        where: { bufferId },
        data: {
          bufferName: updateBufferDto.bufferName,
          description: updateBufferDto.description,
          location: updateBufferDto.location,
        },
      });

      const updatedBuffer = await this.getBufferById(bufferId);

      // Отправляем событие об обновлении буфера
      this.eventsService.emitToRoom('buffers', 'bufferUpdated', {
        buffer: updatedBuffer,
        changes: {
          name: oldName !== updatedBuffer.bufferName,
          location: oldLocation !== updatedBuffer.location,
        },
        timestamp: new Date().toISOString(),
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Буфер ID: ${bufferId} успешно обновлен с "${oldName}" на "${updatedBuffer.bufferName}" за ${executionTime}ms`,
      );

      return updatedBuffer;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при обновлении буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Удалить буфер
   */
  async deleteBuffer(bufferId: number) {
    const startTime = Date.now();
    this.logger.log(`Запрос на удаление буфера с ID: ${bufferId}`);

    try {
      const buffer = await this.prisma.buffer.findUnique({
        where: { bufferId },
        include: {
          bufferCells: {
            include: {
              palletBufferCells: true,
              pickerTasksFrom: true,
              pickerTasksTo: true,
            },
          },
        },
      });

      if (!buffer) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка удаления несуществующего буфера с ID ${bufferId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Буфер с ID ${bufferId} не найден`);
      }

      // Проверяем, не используется ли буфер
      const usageCount = buffer.bufferCells.reduce((count, cell) => {
        return count + 
          cell.palletBufferCells.length + 
          cell.pickerTasksFrom.length + 
          cell.pickerTasksTo.length;
      }, 0);

      if (usageCount > 0) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка удаления используемого буфера "${buffer.bufferName}" (ID: ${bufferId}), используется в ${usageCount} записях за ${executionTime}ms`,
        );
        throw new BadRequestException(
          `Невозможно удалить буфер. Его ячейки используются в ${usageCount} записях`,
        );
      }

      await this.prisma.buffer.delete({
        where: { bufferId },
      });

      // Отправляем событие об удалении буфера
      this.eventsService.emitToRoom('buffers', 'bufferDeleted', {
        bufferId: bufferId,
        bufferName: buffer.bufferName,
        timestamp: new Date().toISOString(),
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Буфер "${buffer.bufferName}" (ID: ${bufferId}) успешно удален за ${executionTime}ms`,
      );

      return { message: 'Буфер успешно удален' };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Ошибка при удалении буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Скопировать буфер
   */
  async copyBuffer(bufferId: number, copyBufferDto: CopyBufferDto): Promise<BufferDetailResponse> {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на копирование буфера ID: ${bufferId} с данными: ${JSON.stringify(copyBufferDto)}`,
    );

    try {
      const originalBuffer = await this.getBufferById(bufferId);
      const { newBufferName, newLocation, copyCells = true, copyStages = true } = copyBufferDto;

      // Проверяем уникальность нового названия
      const existingBuffer = await this.prisma.buffer.findFirst({
        where: { bufferName: newBufferName },
      });

      if (existingBuffer) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Буфер с названием "${newBufferName}" уже существует за ${executionTime}ms`,
        );
        throw new BadRequestException(
          `Буфер с названием "${newBufferName}" уже существует`,
        );
      }

      const copiedBufferId = await this.prisma.$transaction(async (prisma) => {
        // Создаем новый буфер
        const newBuffer = await prisma.buffer.create({
          data: {
            bufferName: newBufferName,
            description: originalBuffer.description,
            location: newLocation || originalBuffer.location,
          },
        });

        this.logger.log(
          `Создан новый буфер с ID: ${newBuffer.bufferId} для копирования`,
        );

        // Копируем ячейки если нужно
        if (copyCells && originalBuffer.bufferCells.length > 0) {
          this.logger.log(
            `Копирование ${originalBuffer.bufferCells.length} ячеек в новый буфер`,
          );
          
          for (const cell of originalBuffer.bufferCells) {
            await prisma.bufferCell.create({
              data: {
                bufferId: newBuffer.bufferId,
                cellCode: cell.cellCode,
                status: cell.status,
                capacity: cell.capacity,
                currentLoad: 0, // Новые ячейки начинают пустыми
              },
            });
          }
        }

        // Копируем связи с этапами если нужно
        if (copyStages && originalBuffer.bufferStages.length > 0) {
          this.logger.log(
            `Копирование связей с ${originalBuffer.bufferStages.length} этапами в новый буфер`,
          );
          
          for (const bufferStage of originalBuffer.bufferStages) {
            await prisma.bufferStage.create({
              data: {
                bufferId: newBuffer.bufferId,
                stageId: bufferStage.stageId,
              },
            });
          }
        }

        return newBuffer.bufferId;
      });

      // Получаем скопированный буфер со всеми данными
      const finalCopiedBuffer = await this.getBufferById(copiedBufferId);

      // Отправляем событие о копировании буфера
      this.eventsService.emitToRoom('buffers', 'bufferCopied', {
        originalBuffer: originalBuffer,
        copiedBuffer: finalCopiedBuffer,
        copyOptions: { copyCells, copyStages },
        timestamp: new Date().toISOString(),
      });

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Буфер "${originalBuffer.bufferName}" успешно скопирован как "${newBufferName}" (ID: ${finalCopiedBuffer.bufferId}) за ${executionTime}ms`,
      );

      return finalCopiedBuffer;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Ошибка при копировании буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // ================================
  // Вспомогательные методы
  // ================================

  /**
   * Получить статистику буферов
   */
  async getBuffersStatistics() {
    const startTime = Date.now();
    this.logger.log('📊 BuffersService.getBuffersStatistics: Получение статистики');

    try {
      console.log('🔢 Подсчет буферов...');
      const buffersCount = await this.prisma.buffer.count();

      console.log('🔢 Подсчет ячеек буферов...');
      const bufferCellsCount = await this.prisma.bufferCell.count();

      console.log('🔢 Подсчет связей буферов с этапами...');
      const bufferStagesCount = await this.prisma.bufferStage.count();

      console.log('🔢 Подсчет занятых ячеек...');
      const occupiedCellsCount = await this.prisma.bufferCell.count({
        where: { status: 'OCCUPIED' },
      });

      console.log('🔢 Подсчет зарезервированных ячеек...');
      const reservedCellsCount = await this.prisma.bufferCell.count({
        where: { status: 'RESERVED' },
      });

      console.log('🔢 Подсчет активных задач комплектовщиков...');
      const pickerTasksCount = await this.prisma.pickerTask.count({
        where: {
          OR: [
            { fromCellId: { not: null } },
            { toCellId: { not: null } },
          ],
        },
      });

      const result = {
        buffers: buffersCount,
        bufferCells: bufferCellsCount,
        bufferStageConnections: bufferStagesCount,
        occupiedCells: occupiedCellsCount,
        reservedCells: reservedCellsCount,
        availableCells: bufferCellsCount - occupiedCellsCount - reservedCellsCount,
        pickerTasks: pickerTasksCount,
      };

      console.log('📊 Статистика буферов:', JSON.stringify(result, null, 2));
      const executionTime = Date.now() - startTime;
      this.logger.log(
        `✅ BuffersService.getBuffersStatistics: Статистика подготовлена за ${executionTime}ms`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        '❌ BuffersService.getBuffersStatistics: Ошибка при получении статистики буферов:',
        error.stack,
      );
      throw error;
    }
  }
}