import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { OrderQueryDto } from '../dto/order-query.dto';

@Injectable()
export class OrdersService {
  constructor(private readonly prisma: PrismaService) {}

  // Получение списка заказов с фильтрами и пагинацией
  async getOrders(query: OrderQueryDto) {
    const { active, page = 1, limit = 10 } = query;
    const whereClause = active !== undefined 
      ? { completed: active ? false : true }
      : {};

    return this.prisma.productionOrder.findMany({
      where: whereClause,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true, // Укажите здесь поля, которые вы хотите получить
        runNumber: true,
        name: true,
        progress: true,
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
