import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { PackagingDataDto } from '../dto/packaging-masterData.dto';

@Injectable()
export class PackagingMasterService {
  constructor(private readonly prisma: PrismaService) {}

  // Получение данных об упаковках для заказа
  async getPackagingByOrderId(orderId: number): Promise<PackagingDataDto[]> {
    // Получаем все упаковки (ypaks), связанные с заказом
    const ypaks = await this.prisma.productionYpak.findMany({
      where: {
        orderId: orderId,
      },
      include: {
        details: {
          include: {
            detail: true,
          },
        },
      },
    });

    // Преобразуем данные в формат DTO
    const packagingData: PackagingDataDto[] = await Promise.all(
      ypaks.map(async (ypak) => {
        // Рассчитываем общее количество деталей для этой упаковки
        const totalQuantity = ypak.details.reduce(
          (sum, detailRelation) => sum + detailRelation.quantity,
          0,
        );

        // Рассчитываем количество деталей, готовых к упаковке
        // Здесь должен быть расчет деталей, прошедших все предыдущие этапы обработки
        // TODO: Доработать логику расчета количества деталей, готовых к упаковке
        let readyForPackaging = 0;

        for (const detailRelation of ypak.details) {
          // Получаем информацию о текущем этапе обработки для каждой детали
          // Это временная логика, которая потом будет заменена на более сложную
          const detailId = detailRelation.detailId;

          // Находим все поддоны с этой деталью, которые прошли все этапы обработки
          const completedPallets = await this.prisma.productionPallets.findMany(
            {
              where: {
                detailId: detailId,
                detailOperations: {
                  some: {
                    status: 'COMPLETED',
                    // Здесь должно быть условие для определения, что это последний этап
                    // перед упаковкой. Это может быть определено по sequenceInRoute
                    // TODO: доработать условие для определения завершенного этапа перед упаковкой
                  },
                },
              },
            },
          );

          // Суммируем количество деталей на этих поддонах
          const readyQuantity = completedPallets.reduce(
            (sum, pallet) => sum + pallet.quantity,
            0,
          );

          readyForPackaging += readyQuantity;
        }

        return {
          article: ypak.article || 'Н/Д', // Если артикул не указан, возвращаем "Н/Д"
          name: ypak.name,
          totalQuantity,
          readyForPackaging,
          // Врем��нные значения по умолчанию для следующих полей:
          allocated: 1, // TODO: Доработать логику расчета распределенных деталей
          assembled: 2, // TODO: Доработать логику расчета скомплектованных деталей
          packed: 0, // TODO: Доработать логику расчета упакованных деталей
        };
      }),
    );

    return packagingData;
  }
}
