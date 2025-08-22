import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import {
  CreateBufferCellDto,
  UpdateBufferCellDto,
  BufferCellResponse,
  CellStatus,
} from '../../dto/buffers/buffers.dto';


@Injectable()
export class BufferCellsService {
  private readonly logger = new Logger(BufferCellsService.name);

  constructor(
    private prisma: PrismaService,

  ) {}

  // ================================
  // CRUD операции для ячеек буфера
  // ================================

  /**
   * Получить все ячейки буфера
   */
  async getBufferCells(bufferId: number): Promise<BufferCellResponse[]> {
    const startTime = Date.now();
    this.logger.log(`Запрос на получение ячеек буфера с ID: ${bufferId}`);

    try {
      const buffer = await this.prisma.buffer.findUnique({
        where: { bufferId },
      });

      if (!buffer) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка получения ячеек несуществующего буфера с ID ${bufferId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Буфер с ID ${bufferId} не найден`);
      }

      const cells = await this.prisma.bufferCell.findMany({
        where: { bufferId },
        orderBy: {
          cellCode: 'asc',
        },
      });

      const result: BufferCellResponse[] = cells.map((cell) => ({
        cellId: cell.cellId,
        bufferId: cell.bufferId,
        cellCode: cell.cellCode,
        status: cell.status as CellStatus,
        capacity: Number(cell.capacity),
        currentLoad: Number(cell.currentLoad),
        createdAt: cell.createdAt,
        updatedAt: cell.updatedAt,
      }));

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Получено ${result.length} ячеек для буфера "${buffer.bufferName}" за ${executionTime}ms`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при получении ячеек буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Создать ячейку буфера
   */
  async createBufferCell(
    bufferId: number,
    createBufferCellDto: CreateBufferCellDto,
  ): Promise<BufferCellResponse> {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на создание ячейки для буфера ID: ${bufferId}, данные: ${JSON.stringify(createBufferCellDto)}`,
    );

    try {
      const buffer = await this.prisma.buffer.findUnique({
        where: { bufferId },
      });

      if (!buffer) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка создания ячейки для несуществующего буфера с ID ${bufferId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Буфер с ID ${bufferId} не найден`);
      }

      // Проверяем уникальность кода ячейки в рамках буфера
      const existingCell = await this.prisma.bufferCell.findFirst({
        where: {
          bufferId,
          cellCode: createBufferCellDto.cellCode,
        },
      });

      if (existingCell) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Ячейка с кодом "${createBufferCellDto.cellCode}" уже существует в буфере ID ${bufferId} за ${executionTime}ms`,
        );
        throw new BadRequestException(
          `Ячейка с кодом "${createBufferCellDto.cellCode}" уже существует в буфере`,
        );
      }

      const bufferCell = await this.prisma.bufferCell.create({
        data: {
          bufferId,
          cellCode: createBufferCellDto.cellCode,
          status: createBufferCellDto.status || CellStatus.AVAILABLE,
          capacity: createBufferCellDto.capacity,
          currentLoad: createBufferCellDto.currentLoad || 0,
        },
      });

      const result: BufferCellResponse = {
        cellId: bufferCell.cellId,
        bufferId: bufferCell.bufferId,
        cellCode: bufferCell.cellCode,
        status: bufferCell.status as CellStatus,
        capacity: Number(bufferCell.capacity),
        currentLoad: Number(bufferCell.currentLoad),
        createdAt: bufferCell.createdAt,
        updatedAt: bufferCell.updatedAt,
      };

      // Отправляем событие о создании ячейки буфера
     

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Создана ячейка буфера ID: ${result.cellId} с кодом "${result.cellCode}" для буфера "${buffer.bufferName}" за ${executionTime}ms`,
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
        `Ошибка при создании ячейки буфера для ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Обновить ячейку буфера
   */
  async updateBufferCell(
    cellId: number,
    updateBufferCellDto: UpdateBufferCellDto,
  ): Promise<BufferCellResponse> {
    const startTime = Date.now();
    this.logger.log(
      `Запрос на обновление ячейки буфера ID: ${cellId}, данные: ${JSON.stringify(updateBufferCellDto)}`,
    );

    try {
      const bufferCell = await this.prisma.bufferCell.findUnique({
        where: { cellId },
        include: {
          buffer: true,
        },
      });

      if (!bufferCell) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка обновления несуществующей ячейки буфера с ID ${cellId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Ячейка буфера с ID ${cellId} не найдена`);
      }

      const oldCellCode = bufferCell.cellCode;
      const oldStatus = bufferCell.status;

      // Проверяем уникальность нового кода ячейки, если он изменяется
      if (updateBufferCellDto.cellCode && updateBufferCellDto.cellCode !== oldCellCode) {
        const existingCell = await this.prisma.bufferCell.findFirst({
          where: {
            bufferId: bufferCell.bufferId,
            cellCode: updateBufferCellDto.cellCode,
            NOT: { cellId },
          },
        });

        if (existingCell) {
          const executionTime = Date.now() - startTime;
          this.logger.warn(
            `Ячейка с кодом "${updateBufferCellDto.cellCode}" уже существует в буфере за ${executionTime}ms`,
          );
          throw new BadRequestException(
            `Ячейка с кодом "${updateBufferCellDto.cellCode}" уже существует в буфере`,
          );
        }
      }

      const updatedBufferCell = await this.prisma.bufferCell.update({
        where: { cellId },
        data: {
          cellCode: updateBufferCellDto.cellCode,
          status: updateBufferCellDto.status,
          capacity: updateBufferCellDto.capacity,
          currentLoad: updateBufferCellDto.currentLoad,
        },
      });

      const result: BufferCellResponse = {
        cellId: updatedBufferCell.cellId,
        bufferId: updatedBufferCell.bufferId,
        cellCode: updatedBufferCell.cellCode,
        status: updatedBufferCell.status as CellStatus,
        capacity: Number(updatedBufferCell.capacity),
        currentLoad: Number(updatedBufferCell.currentLoad),
        createdAt: updatedBufferCell.createdAt,
        updatedAt: updatedBufferCell.updatedAt,
      };

      // Отправляем событие об обновлении ячейки буфера
     

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Обновлена ячейка буфера ID: ${cellId} для буфера "${bufferCell.buffer.bufferName}" с "${oldCellCode}" на "${result.cellCode}" за ${executionTime}ms`,
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
        `Ошибка при обновлении ячейки буфера ID: ${cellId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Удалить ячейку буфера
   */
  async deleteBufferCell(cellId: number) {
    const startTime = Date.now();
    this.logger.log(`Запрос на удаление ячейки буфера с ID: ${cellId}`);

    try {
      const bufferCell = await this.prisma.bufferCell.findUnique({
        where: { cellId },
        include: {
          buffer: true,
          palletBufferCells: true,
          pickerTasksFrom: true,
          pickerTasksTo: true,
        },
      });

      if (!bufferCell) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка удаления несуществующей ячейки буфера с ID ${cellId} за ${executionTime}ms`,
        );
        throw new NotFoundException(`Ячейка буфера с ID ${cellId} не найдена`);
      }

      // Проверяем, не используется ли ячейка
      const usageCount = 
        bufferCell.palletBufferCells.length +
        bufferCell.pickerTasksFrom.length +
        bufferCell.pickerTasksTo.length;

      if (usageCount > 0) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Попытка удаления используемой ячейки "${bufferCell.cellCode}" (ID: ${cellId}), используется в ${usageCount} записях за ${executionTime}ms`,
        );
        throw new BadRequestException(
          `Невозможно удалить ячейку. Она используется в ${usageCount} записях`,
        );
      }

      await this.prisma.bufferCell.delete({
        where: { cellId },
      });

      // Отправляем событие об удалении ячейки буфера
     

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Удалена ячейка "${bufferCell.cellCode}" (ID: ${cellId}) из буфера "${bufferCell.buffer.bufferName}" за ${executionTime}ms`,
      );

      return { message: 'Ячейка буфера успешно удалена' };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error(
        `Ошибка при удалении ячейки буфера ID: ${cellId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  // ================================
  // Вспомогательные методы
  // ================================

  /**
   * Создать несколько ячеек буфера (используется в транзакциях)
   */
  async createBufferCells(
    bufferId: number,
    cells: CreateBufferCellDto[],
    prisma: any,
  ) {
    const startTime = Date.now();
    this.logger.log(
      `Создание ${cells.length} ячеек для буфера ID: ${bufferId}`,
    );

    try {
      for (let i = 0; i < cells.length; i++) {
        const cell = cells[i];
        await prisma.bufferCell.create({
          data: {
            bufferId,
            cellCode: cell.cellCode,
            status: cell.status || CellStatus.AVAILABLE,
            capacity: cell.capacity,
            currentLoad: cell.currentLoad || 0,
          },
        });
        this.logger.log(
          `Создана ячейка ${i + 1}/${cells.length} для буфера ID: ${bufferId}`,
        );
      }

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Успешно создано ${cells.length} ячеек для буфера ID: ${bufferId} за ${executionTime}ms`,
      );
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logger.error(
        `Ошибка при создании ячеек для буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Получить статистику по ячейкам буфера
   */
  async getBufferCellsStatistics(bufferId: number) {
    const startTime = Date.now();
    this.logger.log(`Запрос статистики ячеек для буфера ID: ${bufferId}`);

    try {
      const buffer = await this.prisma.buffer.findUnique({
        where: { bufferId },
      });

      if (!buffer) {
        const executionTime = Date.now() - startTime;
        this.logger.warn(
          `Буфер с ID ${bufferId} не найден при запросе статистики за ${executionTime}ms`,
        );
        throw new NotFoundException(`Буфер с ID ${bufferId} не найден`);
      }

      const totalCells = await this.prisma.bufferCell.count({
        where: { bufferId },
      });

      const availableCells = await this.prisma.bufferCell.count({
        where: { bufferId, status: CellStatus.AVAILABLE },
      });

      const occupiedCells = await this.prisma.bufferCell.count({
        where: { bufferId, status: CellStatus.OCCUPIED },
      });

      const reservedCells = await this.prisma.bufferCell.count({
        where: { bufferId, status: CellStatus.RESERVED },
      });

      const totalCapacity = await this.prisma.bufferCell.aggregate({
        where: { bufferId },
        _sum: { capacity: true },
      });

      const totalCurrentLoad = await this.prisma.bufferCell.aggregate({
        where: { bufferId },
        _sum: { currentLoad: true },
      });

      const result = {
        bufferId,
        bufferName: buffer.bufferName,
        totalCells,
        availableCells,
        occupiedCells,
        reservedCells,
        totalCapacity: Number(totalCapacity._sum.capacity) || 0,
        totalCurrentLoad: Number(totalCurrentLoad._sum.currentLoad) || 0,
        utilizationPercentage: 
          Number(totalCapacity._sum.capacity) > 0 
            ? Math.round((Number(totalCurrentLoad._sum.currentLoad) / Number(totalCapacity._sum.capacity)) * 100 * 100) / 100
            : 0,
      };

      const executionTime = Date.now() - startTime;
      this.logger.log(
        `Получена статистика ячеек для буфера "${buffer.bufferName}" за ${executionTime}ms`,
      );

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(
        `Ошибка при получении статистики ячеек буфера ID: ${bufferId} за ${executionTime}ms`,
        error.stack,
      );
      throw error;
    }
  }
}