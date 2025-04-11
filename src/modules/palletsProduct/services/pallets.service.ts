import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { PalletDto, PalletsResponseDto } from '../dto/pallet.dto';

@Injectable()
export class PalletsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Получить все поддоны по ID детали
   * @param detailId ID детали
   * @returns Список поддонов с информацией о буфере и станке
   */
  async getPalletsByDetailId(detailId: number): Promise<PalletsResponseDto> {
    // Получаем все поддоны для указанной детали
    const pallets = await this.prisma.productionPallets.findMany({
      where: {
        detailId,
      },
      include: {
        // Включаем данные о ячейке буфера (если поддон находится в буфере)
        bufferCell: {
          include: {
            buffer: true, // Включаем данные о буфере для получения его имени
          },
        },
        // Включаем данные о текущей операции для получения информации о станке
        detailOperations: {
          where: {
            status: 'IN_PROGRESS', // Выбираем только активные операции
          },
          include: {
            machine: true, // Включаем данные о станке
          },
          orderBy: {
            startedAt: 'desc', // Сортируем по дате начала, чтобы получить самую последнюю операцию
          },
          take: 1, // Берём только последнюю операцию
        },
      },
    });

    // Преобразуем данные в формат DTO
    const palletDtos: PalletDto[] = pallets.map((pallet) => {
      // Получаем текущую операцию и связанный с ней станок (если есть)
      const currentOperation = pallet.detailOperations[0];
      const machine = currentOperation?.machine || null;

      return {
        id: pallet.id,
        name: pallet.name,
        quantity: pallet.quantity,
        detailId: pallet.detailId,
        // Форматируем данные о ячейке буфера (если есть)
        bufferCell: pallet.bufferCell
          ? {
              id: pallet.bufferCell.id,
              code: pallet.bufferCell.code,
              bufferId: pallet.bufferCell.bufferId,
              bufferName: pallet.bufferCell.buffer?.name,
            }
          : null,
        // Форматируем данные о станке (если есть)
        machine: machine
          ? {
              id: machine.id,
              name: machine.name,
              status: machine.status,
            }
          : null,
      };
    });

    return {
      pallets: palletDtos,
      total: palletDtos.length,
    };
  }

  /**
   * Получить поддон по ID с информацией о буфере и станке
   * @param id ID поддона
   * @returns Данные о поддоне
   */
  async getPalletById(id: number): Promise<PalletDto | null> {
    const pallet = await this.prisma.productionPallets.findUnique({
      where: { id },
      include: {
        bufferCell: {
          include: {
            buffer: true,
          },
        },
        detailOperations: {
          where: {
            status: 'IN_PROGRESS',
          },
          include: {
            machine: true,
          },
          orderBy: {
            startedAt: 'desc',
          },
          take: 1,
        },
      },
    });

    if (!pallet) return null;

    const currentOperation = pallet.detailOperations[0];
    const machine = currentOperation?.machine || null;

    return {
      id: pallet.id,
      name: pallet.name,
      quantity: pallet.quantity,
      detailId: pallet.detailId,
      bufferCell: pallet.bufferCell
        ? {
            id: pallet.bufferCell.id,
            code: pallet.bufferCell.code,
            bufferId: pallet.bufferCell.bufferId,
            bufferName: pallet.bufferCell.buffer?.name,
          }
        : null,
      machine: machine
        ? {
            id: machine.id,
            name: machine.name,
            status: machine.status,
          }
        : null,
    };
  }
}