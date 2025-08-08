import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';
import { DetailsService } from '../services/details.service';
import { CreateDetailWithPackageDto } from '../dto/create-detail-with-package.dto';
import { SaveDetailsFromFileDto } from '../dto/save-details-from-file.dto';
import { RouteDto } from '../dto/route.dto';

@Controller('details')
export class DetailsController {
  constructor(private readonly detailsService: DetailsService) {}


  /**
   * GET /details/routes
   * Получить список всех маршрутов
   */
  @Get('routes')
  async getRoutesList(): Promise<{ message: string; data: RouteDto[] }> {
    const routes = await this.detailsService.getRoutesList();
    return {
      message: 'Список маршрутов успешно получен',
      data: routes,
    };
  }

  /**
   * GET /details/package/:packageId
   * Получить все детали связанные с упаковкой
   */
  @Get('package/:packageId')
  async getDetailsByPackageId(
    @Param('packageId', ParseIntPipe) packageId: number,
  ) {
    const details = await this.detailsService.getDetailsByPackageId(packageId);
    return {
      message: 'Детали успешно получены',
      data: details,
    };
  }

  /**
   * PUT /details/:id
   * Обновить деталь
   */
  @Put(':id')
  async updateDetail(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDetailDto: any,
  ) {
    const detail = await this.detailsService.updateDetail(id, updateDetailDto);
    return {
      message: 'Деталь успешно обновлена',
      data: detail,
    };
  }

  /**
   * DELETE /details/:id/package/:packageId
   * Удалить деталь из упаковки (или полностью, если больше нет связей)
   */
  @Delete(':id/package/:packageId')
  async deleteDetailFromPackage(
    @Param('id', ParseIntPipe) id: number,
    @Param('packageId', ParseIntPipe) packageId: number,
  ) {
    const result = await this.detailsService.deleteDetailFromPackage(id, packageId);
    return {
      message: result.detailDeleted 
        ? 'Деталь полностью удалена' 
        : 'Связь детали с упаковкой удалена',
      data: result,
    };
  }

  /**
   * POST /details/with-package
   * Создать новую деталь с привязкой к упаковке
   */
  @Post('with-package')
  async createDetailWithPackage(
    @Body() createDetailDto: CreateDetailWithPackageDto,
  ) {
    const detail =
      await this.detailsService.createDetailWithPackage(createDetailDto);
    return {
      message: 'Деталь успешно создана и привязана к упаковке',
      data: detail,
    };
  }

  /**
   * POST /details/save-from-file
   * Сохранить детали из файла с привязкой к упаковкам
   */
  @Post('save-from-file')
  async saveDetailsFromFile(@Body() saveDetailsDto: SaveDetailsFromFileDto) {
    const result = await this.detailsService.saveDetailsFromFile(
      saveDetailsDto.packageId,
      saveDetailsDto.details,
    );
    return {
      message: 'Детали успешно сохранены',
      data: result,
    };
  }
}
