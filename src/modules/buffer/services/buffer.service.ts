import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { BufferCell, CellStatus } from '@prisma/client';

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
  status: CellStatus;
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
      let bufferCells: any[] = [];

      if (segmentId) {
        // Если передан ID участка, сначала находим буферы, связанные с этим участком через BufferStage
        const bufferStages = await this.prisma.bufferStage.findMany({
          where: { stageId: segmentId },
          include: {
            buffer: {
              include: {
                bufferCells: {
                  where: {
                    status: CellStatus.AVAILABLE, // Фильтрация по статусу
                  },
                },
                bufferStages: {
                  include: {
                    stage: {
                      select: {
                        stageId: true,
                        stageName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // Собираем все ячейки из найденных буферов
        bufferCells = bufferStages.flatMap((bufferStage) =>
          bufferStage.buffer.bufferCells.map((cell) => ({
            ...cell,
            buffer: {
              id: bufferStage.buffer.bufferId,
              name: bufferStage.buffer.bufferName,
              location: bufferStage.buffer.location,
              segments: bufferStage.buffer.bufferStages.map((bs) => ({
                id: bs.stage.stageId,
                name: bs.stage.stageName,
              })),
            },
          })),
        );

        this.logger.log(
          `Получено ${bufferCells.length} ячеек буфера для участка ${segmentId}`,
        );
      } else {
        // Получаем все доступные ячейки буфера (если segmentId не указан)
        const cells = await this.prisma.bufferCell.findMany({
          where: {
            status: CellStatus.AVAILABLE, // Фильтрация по статусу
          },
          include: {
            buffer: {
              include: {
                bufferStages: {
                  include: {
                    stage: {
                      select: {
                        stageId: true,
                        stageName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        });

        // Преобразуем данные в нужный формат
        bufferCells = cells.map((cell) => ({
          ...cell,
          buffer: cell.buffer
            ? {
                id: cell.buffer.bufferId,
                name: cell.buffer.bufferName,
                location: cell.buffer.location,
                segments: cell.buffer.bufferStages.map((bs) => ({
                  id: bs.stage.stageId,
                  name: bs.stage.stageName,
                })),
              }
            : null,
        }));

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
          id: cell.cellId,
          code: cell.cellCode,
          status: cell.status,
          capacity: Number(cell.capacity),
          buffer: cell.buffer,
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
}
