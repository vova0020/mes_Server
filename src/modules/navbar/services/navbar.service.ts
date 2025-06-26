import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';

@Injectable()
export class NavbarService {
  private readonly logger = new Logger(NavbarService.name);
  constructor(private readonly prisma: PrismaService) {}

  // Получение упаковок по ID заказа
  async getStage() {
    this.logger.log(`Получен запрос на получение этапов для навбара}`);
    const StageRaw = await this.prisma.productionStageLevel1.findMany({
      orderBy: { stageId: 'asc' },
      select: {
        stageId: true,
        stageName: true,
        description: true,
        finalStage: true,
      },
    });

    // Преобразуем Decimal в number и форматируем данные
    const stages = StageRaw.map((stg) => ({
      id: stg.stageId,
      name: stg.stageName,
      description: stg.description,
      finalStage: stg.finalStage,
    }));

    return stages;
  }
}
