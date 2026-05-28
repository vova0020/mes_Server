import {
  Controller,
  Get,
  Query,
  Logger,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiQuery,
} from '@nestjs/swagger';
import { CustomMachineMasterService } from '../services/custom-machine-master.service';
import {
  CustomMachineSegmentQueryDto,
  CustomMachineSegmentResponseDto,
} from '../dto/custom-machine-master.dto';

@ApiTags('Мастер индивидуального производства - Станки')
@Controller('custom/master/machines')
export class CustomMachineMasterController {
  private readonly logger = new Logger(CustomMachineMasterController.name);

  constructor(
    private readonly customMachineMasterService: CustomMachineMasterService,
  ) {}

  @Get('by-segment')
  @ApiOperation({
    summary: 'Получить все станки индивидуального производства для участка',
  })
  @ApiResponse({
    status: 200,
    description: 'Список станков участка',
    type: [CustomMachineSegmentResponseDto],
  })
  @ApiResponse({
    status: 404,
    description: 'Участок не найден',
  })
  @ApiQuery({
    name: 'stageId',
    required: true,
    type: Number,
    description: 'ID производственного участка',
  })
  async getMachinesBySegment(
    @Query() query: CustomMachineSegmentQueryDto,
  ): Promise<CustomMachineSegmentResponseDto[]> {
    this.logger.log(
      `Запрос на получение станков индивидуального производства для участка с ID: ${query.stageId}`,
    );

    try {
      const machines =
        await this.customMachineMasterService.getMachinesBySegmentId(
          query.stageId,
        );

      this.logger.log(
        `Возвращено ${machines.length} станков индивидуального производства`,
      );
      return machines;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }

      this.logger.error(
        `Ошибка при получении станков индивидуального производства: ${error.message}`,
      );
      throw new InternalServerErrorException(
        'Произошла ошибка при получении станков',
      );
    }
  }
}
