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

@Controller('details')
export class DetailsController {
  constructor(private readonly detailsService: DetailsService) {}

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
   * DELETE /details/:id
   * Удалить деталь
   */
  @Delete(':id')
  async deleteDetail(@Param('id', ParseIntPipe) id: number) {
    await this.detailsService.deleteDetail(id);
    return {
      message: 'Деталь успешно удалена',
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
