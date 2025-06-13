import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  ParseIntPipe,
  HttpStatus,
  HttpCode,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { ProductionStagesLevel2Service } from '../../services/flows/production-stages-level2.service';
import {
  CreateProductionStageLevel2Dto,
  UpdateProductionStageLevel2Dto,
  ProductionStageLevel2ResponseDto,
  LinkSubstageToStageDto,
  RebindSubstageDto,
} from '../../dto/production-stage-level2.dto';

@ApiTags('Технологические операции 2 уровня')
@Controller('settings/production-stages-level2')
export class ProductionStagesLevel2Controller {
  constructor(
    private readonly productionStagesLevel2Service: ProductionStagesLevel2Service,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Создать технологическую операцию 2 уровня' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Подэтап успешно создан',
    type: ProductionStageLevel2ResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Технологическая операция 1 уровня не найдена',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'Подэтап с таким названием уже существует в данной технологической операции',
  })
  async create(
    @Body() createDto: CreateProductionStageLevel2Dto,
  ): Promise<ProductionStageLevel2ResponseDto> {
    return this.productionStagesLevel2Service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все технологические операции 2 уровня' })
  @ApiQuery({
    name: 'stageId',
    required: false,
    description: 'ID технологической операции 1 уровня для фильтрации',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список всех технологических операций 2 уровня',
    type: [ProductionStageLevel2ResponseDto],
  })
  async findAll(
    @Query('stageId', new ParseIntPipe({ optional: true })) stageId?: number,
  ): Promise<ProductionStageLevel2ResponseDto[]> {
    if (stageId) {
      return this.productionStagesLevel2Service.findByStage(stageId);
    }
    return this.productionStagesLevel2Service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить технологическую операцию 2 уровня по ID' })
  @ApiParam({ name: 'id', description: 'ID подэтапа' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Подэтап найден',
    type: ProductionStageLevel2ResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Подэтап не найден',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductionStageLevel2ResponseDto> {
    return this.productionStagesLevel2Service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить технологическую операцию 2 уровня' })
  @ApiParam({ name: 'id', description: 'ID подэтапа' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Подэтап успешно обновлен',
    type: ProductionStageLevel2ResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Подэтап не найден',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'Подэтап с таким названием уже существует в данной технологической операции',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProductionStageLevel2Dto,
  ): Promise<ProductionStageLevel2ResponseDto> {
    return this.productionStagesLevel2Service.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить технологическую операцию 2 уровня' })
  @ApiParam({ name: 'id', description: 'ID подэтапа' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Подэтап успешно удален',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Подэтап не найден',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Нельзя удалить подэтап, который используется в потоках',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.productionStagesLevel2Service.remove(id);
  }

  @Post('link')
  @ApiOperation({
    summary: 'Привязать подэтап к технологической операции 1 уровня',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Подэтап успешно привязан к технологической операции',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Технологическая операция 1 уровня не найдена',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'Подэтап с таким названием уже существует в данной технологической операции',
  })
  async linkSubstageToStage(
    @Body() linkDto: LinkSubstageToStageDto,
  ): Promise<void> {
    return this.productionStagesLevel2Service.linkSubstageToStage(linkDto);
  }

  @Patch(':id/rebind')
  @ApiOperation({
    summary:
      'Перепривязать технологическую операцию 2 уровня к другому этапу 1 уровня',
  })
  @ApiParam({ name: 'id', description: 'ID подэтапа' })
  @ApiResponse({
    status: HttpStatus.OK,
    description:
      'Подэтап успешно перепривязан к новой технологической операции',
    type: ProductionStageLevel2ResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description:
      'Подэтап или целевая технологическая операция 1 уровня не найдена',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'Подэтап уже привязан к указанной технологической операции или подэтап с таким названием уже существует в целевой операции',
  })
  async rebindSubstageToNewStage(
    @Param('id', ParseIntPipe) id: number,
    @Body() rebindDto: RebindSubstageDto,
  ): Promise<ProductionStageLevel2ResponseDto> {
    return this.productionStagesLevel2Service.rebindSubstageToNewStage(
      id,
      rebindDto,
    );
  }
}
