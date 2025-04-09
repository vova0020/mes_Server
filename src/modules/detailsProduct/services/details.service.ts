import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class DetailsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Получение списка деталей для указанного заказа
   * @param orderId - ID производственного заказа
   */
  async getDetailsByOrderId(orderId: number) {
    // Проверяем существование заказа
    const orderExists = await this.prisma.productionOrder.findUnique({
      where: { id: orderId },
    });

    if (!orderExists) {
      throw new NotFoundException(
        `Производственный заказ с ID ${orderId} не найден`,
      );
    }

    // Находим все УПАКи, связанные с заказом
    const ypaks = await this.prisma.productionYpak.findMany({
      where: { orderId },
      include: {
        details: {
          include: {
            detail: true,
          },
        },
      },
    });

    // Если УПАКов нет, возвращаем пустой массив
    if (ypaks.length === 0) {
      return [];
    }

    // Формируем список деталей из всех УПАКов с подсчетом количества
    const detailsMap = new Map();

    // Проходим по всем УПАКам и деталям в них
    for (const ypak of ypaks) {
      for (const ypakDetail of ypak.details) {
        const detail = ypakDetail.detail;

        // Если детали еще нет в нашей карте, добавляем её
        if (!detailsMap.has(detail.id)) {
          // Получаем информацию о поддонах для подсчета статусов
          const pallets = await this.prisma.productionPallets.findMany({
            where: { detailId: detail.id },
            include: {
              detailOperations: true,
            },
          });

          // Вычисляем распределение по статусам
          let readyForProcessing = 0;
          let distributed = 0;
          let completed = 0;

          for (const pallet of pallets) {
            const quantity = pallet.quantity;

            // Считаем операции для определения статуса
            const operations = pallet.detailOperations;
            if (operations.length > 0) {
              const latestOperation = operations.sort(
                (a, b) =>
                  new Date(b.startedAt).getTime() -
                  new Date(a.startedAt).getTime(),
              )[0];

              if (latestOperation.status === 'COMPLETED') {
                completed += quantity;
              } else if (latestOperation.status === 'IN_PROGRESS') {
                distributed += quantity;
              }
            } else {
              readyForProcessing += quantity;
            }
          }

          detailsMap.set(detail.id, {
            id: detail.id,
            articleNumber: detail.article,
            name: detail.name,
            material: detail.material,
            size: detail.size,
            totalQuantity: detail.totalNumber,
            readyForProcessing,
            distributed,
            completed,
          });
        }

        // Увеличиваем общее количество для этой детали
        const currentDetail = detailsMap.get(detail.id);
        currentDetail.totalQuantity += ypakDetail.quantity;
        detailsMap.set(detail.id, currentDetail);
      }
    }

    // Преобразуем Map в массив для ответа
    return Array.from(detailsMap.values());
  }
}
