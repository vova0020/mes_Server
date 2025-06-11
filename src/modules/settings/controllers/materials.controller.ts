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
  Query,
  HttpCode,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MaterialsService } from '../services/materials.service';
import {
  CreateMaterialDto,
  UpdateMaterialDto,
  MaterialResponseDto,
} from '../dto/material.dto';

@ApiTags('Материалы')
@Controller('settings/materials')
export class MaterialsController {
  constructor(private readonly materialsService: MaterialsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать материал' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Материал успешно создан',
    type: MaterialResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Материал с таким названием уже существует',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Одна или несколько указанных групп не найдены',
  })
  async create(
    @Body() createMaterialDto: CreateMaterialDto,
  ): Promise<MaterialResponseDto> {
    return this.materialsService.create(createMaterialDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все материалы' })
  @ApiQuery({
    name: 'groupId',
    required: false,
    description: 'ID группы для фильтрации материалов',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список всех материалов',
    type: [MaterialResponseDto],
  })
  async findAll(
    @Query('groupId', new ParseIntPipe({ optional: true })) groupId?: number,
  ): Promise<MaterialResponseDto[]> {
    if (groupId) {
      return this.materialsService.findByGroup(groupId);
    }
    return this.materialsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить материал по ID' })
  @ApiParam({ name: 'id', description: 'ID материала' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Материал найден',
    type: MaterialResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Материал не найден',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MaterialResponseDto> {
    return this.materialsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить материал' })
  @ApiParam({ name: 'id', description: 'ID материала' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Материал успешно обновлен',
    type: MaterialResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Материал не найден',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Материал с таким названием уже существует',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMaterialDto: UpdateMaterialDto,
  ): Promise<MaterialResponseDto> {
    return this.materialsService.update(id, updateMaterialDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить материал' })
  @ApiParam({ name: 'id', description: 'ID материала' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Материал успешно удален',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Материал не найден',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description:
      'Нельзя удалить материал, который используется в деталях производства',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.materialsService.remove(id);
  }
}
