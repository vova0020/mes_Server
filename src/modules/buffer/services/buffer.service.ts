import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { BufferCell, BufferCellStatus } from '@prisma/client';

// Определяем тип для результата запроса findMany с включением связанных данных
export type BufferCellWithRelations = BufferCell & {
  buffer: {
    id: number;
    name: string;
    location: string | null;
    segments: {
      id: number;
      name: string;
    }[];
  } | null;
};

// Определяем тип для форматированного результата
export interface FormattedBufferCell {
  id: number;
  code: string;
  status: BufferCellStatus;
  capacity: number;
  buffer: {
    id: number;
    name: string;
    location: string | null;
    segments: {
      id: number;
      name: string;
    }[];
  } | null;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class BuffersService {
  private readonly logger = new Logger(BuffersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Получение списка ячеек буфера с включением связанных данных
  async getBufferCells(segmentId?: number): Promise<FormattedBufferCell[]> {
    this.logger.log(
      `Запрос на получение ячеек буфера${segmentId ? ` для участка: ${segmentId}` : ''}`,
    );

    try {
      // Проверяем, есть ли вообще записи в таблице
      const count = await this.prisma.bufferCell.count();
      this.logger.log(`Найдено ${count} ячеек буфера в базе данных`);

      // Строим запрос в зависимости от наличия segmentId
      let bufferCells: BufferCellWithRelations[] = [];

      if (segmentId) {
        // Если передан ID участка, сначала находим буфер, связанный с этим участком
        const segment = await this.prisma.productionSegment.findUnique({
          where: { id: segmentId },
          include: { buffer: true },
        });

        if (segment?.buffer) {
          // Получаем ячейки из буфера, связанного с этим участком
          bufferCells = await this.prisma.bufferCell.findMany({
            where: {
              bufferId: segment.buffer.id,
              status: 'AVAILABLE', // Фильтрация по статусу
            },
            include: {
              buffer: {
                select: {
                  id: true,
                  name: true,
                  location: true,
                  segments: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          });
          this.logger.log(
            `Получено ${bufferCells.length} ячеек буфера для участка ${segmentId}`,
          );
        } else {
          this.logger.warn(`Для участка с ID ${segmentId} не назначен буфер`);
        }
      } else {
        // Получаем все доступные ячейки буфера (если segmentId не указан)
        const targetStatus = 'AVAILABLE'; // Пример значения

        bufferCells = await this.prisma.bufferCell.findMany({
          where: {
            status: targetStatus, // Фильтрация
          },
          include: {
            buffer: {
              select: {
                id: true,
                name: true,
                location: true,
                segments: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        });
        this.logger.log(
          `Получено ${bufferCells.length} ячеек буфера с данными`,
        );
      }

      // Если нет доступных ячеек, возвращаем пустой массив
      if (bufferCells.length === 0) {
        this.logger.log('Нет доступных ячеек буфера со статусом AVAILABLE');
        return [];
      }

      // Преобразуем данные для более удобного использования на клиенте
      const formattedBufferCells: FormattedBufferCell[] = bufferCells.map(
        (cell) => ({
          id: cell.id,
          code: cell.code,
          status: cell.status,
          capacity: cell.capacity,
          buffer: cell.buffer
            ? {
                id: cell.buffer.id,
                name: cell.buffer.name,
                location: cell.buffer.location,
                segments: cell.buffer.segments,
              }
            : null,
          createdAt: cell.createdAt,
          updatedAt: cell.updatedAt,
        }),
      );

      return formattedBufferCells;
    } catch (error) {
      this.logger.error(`Ошибка при получении ячеек буфера: ${error.message}`);
      throw error;
    }
  }

  // Получение детальной информации о конкретной ячейке буфера по ID
  async getBufferCellById(id: number) {
    this.logger.log(`Запрос на получение ячейки буфера с ID: ${id}`);

    try {
      const bufferCell = await this.prisma.bufferCell.findUnique({
        where: { id },
        include: {
          buffer: true,
          pallets: {
            include: {
              detail: true,
              detailOperations: {
                include: {
                  processStep: true,
                  machine: true,
                  operator: {
                    select: {
                      id: true,
                      username: true,
                      details: true,
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!bufferCell) {
        this.logger.warn(`Ячейка буфера с ID ${id} не най��ена`);
        return null;
      }

      this.logger.log(`Получена ячейка буфера с ID: ${id}`);
      return bufferCell;
    } catch (error) {
      this.logger.error(
        `Ошибка при получении ячейки буфера с ID ${id}: ${error.message}`,
      );
      throw error;
    }
  }
}