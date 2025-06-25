import {
  Controller,
  Get,
  Param,
  Query,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PartPalletsService } from '../services/part-pallets.service';
import { PartPalletsQueryDto } from '../dto/part-pallets-query.dto';

@Controller('packaging/pallets')
export class PartPalletsController {
  constructor(private readonly partPalletsService: PartPalletsService) {}

  // Получение всех поддонов детали по ID детали
  @Get('by-part/:partId')
  async getPalletsByPartId(
    @Param('partId') partId: string,
    @Query() query: PartPalletsQueryDto,
  ) {
    const partIdNum = Number(partId);

    if (isNaN(partIdNum) || partIdNum <= 0) {
      throw new BadRequestException('Некорректный ID детали');
    }

    try {
      return await this.partPalletsService.getPalletsByPartId(partIdNum, query);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Ошибка при получении поддонов детали');
    }
  }

  // Получение конкретного поддона детали
  @Get('by-part/:partId/pallet/:palletId')
  async getPalletFromPart(
    @Param('partId') partId: string,
    @Param('palletId') palletId: string,
  ) {
    const partIdNum = Number(partId);
    const palletIdNum = Number(palletId);

    if (isNaN(partIdNum) || partIdNum <= 0) {
      throw new BadRequestException('Некорректный ID детали');
    }

    if (isNaN(palletIdNum) || palletIdNum <= 0) {
      throw new BadRequestException('Некорректный ID поддона');
    }

    try {
      return await this.partPalletsService.getPalletFromPart(
        partIdNum,
        palletIdNum,
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Ошибка при получении поддона');
    }
  }

  // Получение статистики по поддонам детали
  @Get('statistics/:partId')
  async getPartPalletsStatistics(@Param('partId') partId: string) {
    const partIdNum = Number(partId);

    if (isNaN(partIdNum) || partIdNum <= 0) {
      throw new BadRequestException('Некорректный ID детали');
    }

    try {
      return await this.partPalletsService.getPartPalletsStatistics(partIdNum);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException('Ошибка при получении статистики');
    }
  }
}
