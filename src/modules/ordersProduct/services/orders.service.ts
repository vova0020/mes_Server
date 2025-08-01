import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { OrderQueryDto } from '../dto/order-query.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) { }

  // Получение списка заказов с фильтрами (без пагинации)
  async getOrders(query: OrderQueryDto) {
    const { active, showAll = false } = query;

    // Определяем условие фильтрации
    let whereClause: any = {
      // Фильтруем только заказы со статусом "разрешен к запуску"
      status: 'LAUNCH_PERMITTED'
    };

    // Есл�� параметр active явно передан, используем его
    if (active !== undefined) {
      whereClause.isCompleted = active ? false : true;
    }
    // Если showAll не установлен в true, показываем только незавершенные по умолчанию
    else if (!showAll) {
      whereClause.isCompleted = false;
    }
    // Если showAll = true, не добавляем фильтр по isCompleted

    // 1) Получаем «сырые» заказы с Decimal
    const ordersRaw = await this.prisma.order.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      select: {
        orderId: true,
        batchNumber: true,
        orderName: true,
        completionPercentage: true, // <-- Decimal здесь
        isCompleted: true,
        status: true, // Добавляем статус в ответ
      },
    });

    // 2) Мапим Decimal → number
    const orders = ordersRaw.map(o => ({
      id: o.orderId,
      batchNumber: o.batchNumber,
      orderName: o.orderName,
      completionPercentage: o.completionPercentage.toNumber(),  // конвертация!
      isCompleted: o.isCompleted,
      status: o.status, // Добавляем статус в результат
    }));

    return orders;
  }

  // Получение заказа по id
  async getOrderById(orderId: number) {
    return this.prisma.order.findUnique({
      where: { orderId },
    });
  }
}
