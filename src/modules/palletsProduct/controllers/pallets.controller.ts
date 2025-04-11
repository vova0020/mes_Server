import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';
import { PalletsService } from '../services/pallets.service';
import { PalletDto, PalletsResponseDto } from '../dto/pallet.dto';

@ApiTags('pallets')
@Controller('pallets')
export class PalletsController {
  constructor(private readonly palletsService: PalletsService) {}

  @Get('detail/:detailId')
  @ApiOperation({ summary: 'Получить поддоны по ID детали' })
  @ApiParam({ name: 'detailId', description: 'ID детали', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Список поддонов с информацией о буфере и станке',
    type: PalletsResponseDto,
  })
  async getPalletsByDetailId(
    @Param('detailId', ParseIntPipe) detailId: number,
  ): Promise<PalletsResponseDto> {
    return this.palletsService.getPalletsByDetailId(detailId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить поддон по ID' })
  @ApiParam({ name: 'id', description: 'ID поддона', type: Number })
  @ApiResponse({
    status: 200,
    description: 'Информация о поддоне, включая данные о буфере и станке',
    type: PalletDto,
  })
  @ApiResponse({ status: 404, description: 'Поддон не найден' })
  async getPalletById(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<PalletDto> {
    const pallet = await this.palletsService.getPalletById(id);

    if (!pallet) {
      throw new NotFoundException(`Поддон с ID ${id} не найден`);
    }

    return pallet;
  }
}
