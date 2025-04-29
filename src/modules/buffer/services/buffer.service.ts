import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class BuffersService {
  private readonly logger = new Logger(BuffersService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Получение списка ячеек буфера с включением связанных данных
  async getBufferCells() {
    this.logger.log('Запрос на получение ячеек буфера');

    try {
      // Проверяем, есть ли вообще записи в таблице
      const count = await this.prisma.bufferCell.count();
      this.logger.log(`Найдено ${count} ячеек буфера в базе данных`);

      // Получаем ячейки буфера с включением связанных данных
      const bufferCells = await this.prisma.bufferCell.findMany({
        include: {
          buffer: {
            select: {
              id: true,
              name: true,
              location: true,
            },
          },
          pallets: {
            select: {
              id: true,
              name: true,
              quantity: true,
              detail: {
                select: {
                  id: true,
                  article: true,
                  name: true,
                },
              },
            },
          },
        },
      });

      this.logger.log(`Получено ${bufferCells.length} ячеек буфера с данными`);

      // Преобразуем данные для более удобного использования на клиенте
      const formattedBufferCells = bufferCells.map((cell) => ({
        id: cell.id,
        code: cell.code,
        status: cell.status,
        capacity: cell.capacity,
        buffer: cell.buffer
          ? {
              id: cell.buffer.id,
              name: cell.buffer.name,
              location: cell.buffer.location,
            }
          : null,
        palletsCount: cell.pallets.length,
        pallets: cell.pallets.map((pallet) => ({
          id: pallet.id,
          name: pallet.name,
          quantity: pallet.quantity,
          detail: pallet.detail
            ? {
                id: pallet.detail.id,
                article: pallet.detail.article,
                name: pallet.detail.name,
              }
            : null,
        })),
        createdAt: cell.createdAt,
        updatedAt: cell.updatedAt,
      }));

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
        this.logger.warn(`Ячейка буфера с ID ${id} не найдена`);
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
