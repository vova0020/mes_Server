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
import { ProductionStagesLevel1Service } from '../../services/flows/production-stages-level1.service';
import {
  CreateProductionStageLevel1Dto,
  UpdateProductionStageLevel1Dto,
  ProductionStageLevel1ResponseDto,
} from '../../dto/production-stage-level1.dto';

@ApiTags('Технологические операции 1 уровня')
@Controller('settings/production-stages-level1')
export class ProductionStagesLevel1Controller {
  constructor(
    private readonly productionStagesLevel1Service: ProductionStagesLevel1Service,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Создать технологическую операцию 1 уровня' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Технологическая операция успешно с��здана',
    type: ProductionStageLevel1ResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Технологическая операция с таким названием уже существует',
  })
  async create(
    @Body() createDto: CreateProductionStageLevel1Dto,
  ): Promise<ProductionStageLevel1ResponseDto> {
    return this.productionStagesLevel1Service.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все технологические операции 1 уровня' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список всех технологических операций 1 уровня',
    type: [ProductionStageLevel1ResponseDto],
  })
  async findAll(): Promise<ProductionStageLevel1ResponseDto[]> {
    return this.productionStagesLevel1Service.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить технологическую операцию 1 уровня по ID' })
  @ApiParam({ name: 'id', description: 'ID технологической операции' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Технологическая операция найдена',
    type: ProductionStageLevel1ResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Технологическая операция не найдена',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<ProductionStageLevel1ResponseDto> {
    return this.productionStagesLevel1Service.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить технологическую операцию 1 уровня' })
  @ApiParam({ name: 'id', description: 'ID технологической операции' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Технологическая операция успешно обновлена',
    type: ProductionStageLevel1ResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Технологическая операция не найдена',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Технологическая операция с таким названием уже существует',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateDto: UpdateProductionStageLevel1Dto,
  ): Promise<ProductionStageLevel1ResponseDto> {
    return this.productionStagesLevel1Service.update(id, updateDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить технологическую операцию 1 уровня' })
  @ApiParam({ name: 'id', description: 'ID технологической операции' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Технологическая операция успешно удалена',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Технологическая операция не найдена',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Нельзя удалить технологическую операцию, которая используется в потоках, линиях или станках',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.productionStagesLevel1Service.remove(id);
  }
}