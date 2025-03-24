import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

// Сервис для работы с базой данных через Prisma
@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  // Подключаемся к базе при инициализации модуля
  async onModuleInit() {
    await this.$connect();
  }

  // Отключаемся от базы при завершении работы модуля
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
