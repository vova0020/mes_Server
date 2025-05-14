import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { OrderQueryDto } from '../dto/order-query.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) { }

  // Получение списка заказов с фильтрами и пагинацией
  async getOrders(query: OrderQueryDto) {
    const { active, page = 1, limit = 10, showAll = false } = query;

    // Определяем условие фильтрации
    let whereClause = {};

    // Если параметр active явно передан, используем его
    if (active !== undefined) {
      whereClause = { completed: active ? false : true };
    }
    // Если showAll не установлен в true, показываем только незавершенные по умолчанию
    else if (!showAll) {
      whereClause = { completed: false };
    }
    // Если showAll = true, возвращаем все заказы (whereClause остаётся пустым)

    return this.prisma.productionOrder.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        runNumber: true,
        name: true,
        progress: true,
        completed: true, // Добавляем поле completed для отображения статуса
      },
    });
  }

  // Получение заказа по id
  async getOrderById(id: number) {
    return this.prisma.productionOrder.findUnique({
      where: { id },
    });
  }
}