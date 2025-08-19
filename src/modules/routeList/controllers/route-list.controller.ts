import {
  Controller,
  Get,
  Param,
  NotFoundException,
  InternalServerErrorException,
  Logger,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import {
  RouteListService,
  PalletRouteData,
} from '../services/route-list.service';

@ApiTags('route-list')
@Controller('route-list')
export class RouteListController {
  private readonly logger = new Logger(RouteListController.name);

  constructor(private readonly routeListService: RouteListService) {}

  @Get('pallet/:palletId')
  @ApiOperation({ summary: 'Получить данные поддона для маршрутной таблицы' })
  @ApiResponse({
    status: 200,
    description: 'Данные поддона успешно получены',
  })
  @ApiResponse({ status: 404, description: 'Поддон не найден' })
  @ApiParam({
    name: 'palletId',
    type: Number,
    description: 'ID поддона',
  })
  async getPalletRouteData(
    @Param('palletId', ParseIntPipe) palletId: number,
  ): Promise<PalletRouteData> {
    this.logger.log(`Получен запрос на данные поддона: ${palletId}`);

    try {
      const palletData = await this.routeListService.getPalletRouteData(palletId);

      if (!palletData) {
        this.logger.warn(`Поддон с ID ${palletId} не найден`);
        throw new NotFoundException('Поддон не найден');
      }

      this.logger.log(`Возвращены данные для поддона ${palletId}`);
      return palletData;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(`Ошибка при получении данных поддона: ${error.message}`);
      throw new InternalServerErrorException(
        'Произошла ошибка при получении данных поддона',
      );
    }
  }
}