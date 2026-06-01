import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  ParseIntPipe,
  Put,
  Query,
} from '@nestjs/common';
import { CustomPalletsService } from '../services/custom-pallets.service';
import { CreateCustomPalletDto } from '../dto/create-custom-pallet.dto';
import { RedistributePartsDto } from '../dto/redistribute-parts.dto';

@Controller('custom-orders/:orderId/pallets')
export class CustomPalletsController {
  constructor(private readonly customPalletsService: CustomPalletsService) {}

  // Получение всех поддонов для заказа
  @Get()
  async getPalletsByOrderId(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Query('stageId') stageId?: string,
  ) {
    return await this.customPalletsService.getPalletsByOrderId(
      orderId,
      stageId ? Number(stageId) : undefined,
    );
  }

  // Создание поддона с деталями
  @Post()
  async createPallet(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() dto: CreateCustomPalletDto,
  ) {
    return await this.customPalletsService.createPallet(orderId, dto);
  }
}

@Controller('custom-pallets')
export class CustomPalletsManagementController {
  constructor(private readonly customPalletsService: CustomPalletsService) {}

  // Получение деталей конкретного поддона
  @Get(':id/parts')
  async getPartsByPalletId(
    @Param('id', ParseIntPipe) id: number,
    @Query('stageId') stageId?: string,
  ) {
    return await this.customPalletsService.getPartsByPalletId(
      id,
      stageId ? Number(stageId) : undefined,
    );
  }

  // Удаление поддона
  @Delete(':id')
  async deletePallet(@Param('id', ParseIntPipe) id: number) {
    return await this.customPalletsService.deletePallet(id);
  }

  // Перераспределение деталей между поддонами
  @Put('redistribute')
  async redistributeParts(@Body() dto: RedistributePartsDto) {
    return await this.customPalletsService.redistributeParts(dto);
  }
}
