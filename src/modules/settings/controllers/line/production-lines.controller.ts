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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { ProductionLinesService } from '../../services/line/production-lines.service';
import {
  CreateProductionLineDto,
  UpdateProductionLineDto,
  ProductionLineResponseDto,
  LinkStageToLineDto,
  LineStageResponseDto,
  LinkMaterialToLineDto,
  LineMaterialResponseDto,
  LineMaterialsUpdateDto,
  LineStagesUpdateDto,
} from '../../dto/line/production-line.dto';

@ApiTags('Производственные потоки')
@Controller('settings/production-lines')
export class ProductionLinesController {
  constructor(
    private readonly productionLinesService: ProductionLinesService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Создать производственный поток' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Поток успешно создан',
    type: ProductionLineResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Поток с таким названием уже существует',
  })
  async create(
    @Body() createLineDto: CreateProductionLineDto,
  ): Promise<ProductionLineResponseDto> {
    return this.productionLinesService.create(createLineDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все производственные потоки' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список всех потоков',
    type: [ProductionLineResponseDto],
  })
  async findAll(): Promise<ProductionLineResponseDto[]> {
    return this.productionLinesService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить производственный поток по ID' })
  @ApiParam({ name: 'id', description: 'ID потока' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Поток найден',
    type: ProductionLineResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поток не найден',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductionLineResponseDto> {
    return this.productionLinesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить производственный поток' })
  @ApiParam({ name: 'id', description: 'ID потока' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Поток успешно обновлен',
    type: ProductionLineResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поток не найден',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Поток с таким названием уже существует',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateLineDto: UpdateProductionLineDto,
  ): Promise<ProductionLineResponseDto> {
    return this.productionLinesService.update(id, updateLineDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить производственный поток' })
  @ApiParam({ name: 'id', description: 'ID потока' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Поток успешно удален',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поток не найден',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.productionLinesService.remove(id);
  }

  // Эндпоинты для работы с этапами

  @Post('link-stage')
  @ApiOperation({ summary: 'Привязать этап к производственному потоку' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Этап успешно привязан к потоку',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поток или этап не найдены',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Этап уже привязан к этому потоку',
  })
  async linkStageToLine(@Body() linkDto: LinkStageToLineDto): Promise<void> {
    return this.productionLinesService.linkStageToLine(linkDto);
  }

  @Delete('line-stage/:lineStageId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отвязать этап от производственного потока' })
  @ApiParam({ name: 'lineStageId', description: 'ID связи этапа с потоком' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Этап успешно отвязан от потока',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Связь между потоком и этапом не найдена',
  })
  async unlinkStageFromLine(
    @Param('lineStageId', ParseIntPipe) lineStageId: number,
  ): Promise<void> {
    return this.productionLinesService.unlinkStageFromLine(lineStageId);
  }

  @Get(':id/stages')
  @ApiOperation({ summary: 'Получить все этапы в производственном потоке' })
  @ApiParam({ name: 'id', description: 'ID потока' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список этапов в потоке',
    type: [LineStageResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поток не найден',
  })
  async getStagesInLine(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<LineStageResponseDto[]> {
    return this.productionLinesService.getStagesInLine(id);
  }

  @Patch(':id/stages')
  @ApiOperation({ summary: 'Обновить все этапы в производственном потоке' })
  @ApiParam({ name: 'id', description: 'ID потока' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Этапы потока успешно обновлены',
    type: [LineStageResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поток не найден или один из этапов не найден',
  })
  async updateLineStages(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: LineStagesUpdateDto,
  ): Promise<LineStageResponseDto[]> {
    return this.productionLinesService.updateLineStages(id, updateDto);
  }

  // Эндпоинты для работы с материалами

  @Post('link-material')
  @ApiOperation({ summary: 'Привязать материал к производственному потоку' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Материал успешно привязан к потоку',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поток или материал не найдены',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Материал уже привязан к этому потоку',
  })
  async linkMaterialToLine(
    @Body() linkDto: LinkMaterialToLineDto,
  ): Promise<void> {
    return this.productionLinesService.linkMaterialToLine(linkDto);
  }

  @Delete('unlink-material')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Отвязать материал от производственного потока' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Материал успешно отвязан от потока',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Связь между потоком и материалом не найдена',
  })
  async unlinkMaterialFromLine(
    @Body() linkDto: LinkMaterialToLineDto,
  ): Promise<void> {
    return this.productionLinesService.unlinkMaterialFromLine(linkDto);
  }

  @Get(':id/materials')
  @ApiOperation({ summary: 'Получить все материалы в производственном потоке' })
  @ApiParam({ name: 'id', description: 'ID потока' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список материалов в потоке',
    type: [LineMaterialResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поток не найден',
  })
  async getMaterialsInLine(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<LineMaterialResponseDto[]> {
    return this.productionLinesService.getMaterialsInLine(id);
  }

  @Patch(':id/materials')
  @ApiOperation({ summary: 'Обновить все материалы в производственном потоке' })
  @ApiParam({ name: 'id', description: 'ID потока' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Материалы потока успешно обновлены',
    type: [LineMaterialResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Поток не найден или один из материалов не найден',
  })
  async updateLineMaterials(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: LineMaterialsUpdateDto,
  ): Promise<LineMaterialResponseDto[]> {
    return this.productionLinesService.updateLineMaterials(id, updateDto);
  }
}
