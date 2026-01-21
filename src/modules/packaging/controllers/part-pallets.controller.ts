import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  NotFoundException,
  BadRequestException,
  HttpException,
  HttpStatus,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { PartPalletsService } from '../services/part-pallets.service';
import { PartPalletsQueryDto } from '../dto/part-pallets-query.dto';
import { AssignPalletToPackageDto } from '../dto/assign-pallet-to-package.dto';
import { ApiOperation, ApiResponse, ApiBody } from '@nestjs/swagger';
import { DefectPalletPartsDto } from 'src/modules/palletsProduct/dto/pallet-master.dto';

@Controller('packaging/pallets')
export class PartPalletsController {
  private readonly logger = new Logger(PartPalletsController.name);

  constructor(private readonly partPalletsService: PartPalletsService) {}

  // Получение всех поддонов детали по ID детали
  @Get('by-part/:partId')
  async getPalletsByPartId(
    @Param('partId') partId: string,
    @Query('packageId') packageId?: string,
    @Query() query: Omit<PartPalletsQueryDto, 'packageId'> = {},
  ) {
    const partIdNum = Number(partId);
    const packageIdNum = packageId ? Number(packageId) : undefined;

    if (isNaN(partIdNum) || partIdNum <= 0) {
      throw new BadRequestException('Некорректный ID детали');
    }

    if (packageId && (isNaN(packageIdNum!) || packageIdNum! <= 0)) {
      throw new BadRequestException('Некорректный ID упаковки');
    }

    try {
      return await this.partPalletsService.getPalletsByPartId(
        partIdNum,
        packageIdNum,
        query,
      );
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

  // Назначение поддона на упаковку
  @Post('assign-to-package')
  async assignPalletToPackage(@Body() dto: AssignPalletToPackageDto) {
    try {
      return await this.partPalletsService.assignPalletToPackage(dto);
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      throw new BadRequestException(
        'Ошибка при назначении поддона на упаковку',
      );
    }
  }

  @Post('defect-parts')
  @ApiOperation({ summary: 'Отбраковать детали с поддона' })
  @ApiBody({ type: DefectPalletPartsDto })
  @ApiResponse({
    status: 200,
    description: 'Детали успешно отбракованы',
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка при отбраковке деталей',
  })
  async defectPalletParts(@Body() dto: DefectPalletPartsDto) {
    this.logger.log(
      `Отбраковка ${dto.quantity} деталей с поддона ${dto.palletId}`,
    );

    try {
      return await this.partPalletsService.defectPalletParts(
        dto.palletId,
        dto.quantity,
        dto.reportedById,
        dto.description,
        dto.machineId,
        dto.stageId,
      );
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.message) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(`Ошибка при отбраковке: ${error.message}`);
      throw new InternalServerErrorException('Ошибка при отбраковке деталей');
    }
  }

  @Post('return-parts')
  @ApiOperation({ summary: 'Вернуть детали на производство после рекламации' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        partId: { type: 'number', description: 'ID детали', example: 1 },
        palletId: { type: 'number', description: 'ID поддона', example: 1 },
        quantity: { type: 'number', description: 'Количество деталей для возврата', example: 10 },
        returnToStageId: { type: 'number', description: 'ID этапа для возврата', example: 1 },
        userId: { type: 'number', description: 'ID пользователя', example: 1 },
      },
      required: ['partId', 'palletId', 'quantity', 'returnToStageId', 'userId'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Детали успешно возвращены на производство',
  })
  async returnPartsToProduction(
    @Body()
    returnDto: {
      partId: number;
      palletId: number;
      quantity: number;
      returnToStageId: number;
      userId: number;
    },
  ) {
    this.logger.log(
      `Возврат ${returnDto.quantity} деталей для детали ${returnDto.partId} на поддон ${returnDto.palletId}, этап ${returnDto.returnToStageId}`,
    );

    try {
      return await this.partPalletsService.returnPartsToProduction(
        returnDto.partId,
        returnDto.palletId,
        returnDto.quantity,
        returnDto.returnToStageId,
        returnDto.userId,
      );
    } catch (error: any) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      if (error.message) {
        throw new BadRequestException(error.message);
      }
      this.logger.error(`Ошибка при возврате деталей: ${error.message}`);
      throw new InternalServerErrorException('Ошибка при возврате деталей на производство');
    }
  }
}
