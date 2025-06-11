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
import { MaterialGroupsService } from '../services/material-groups.service';
import {
  CreateMaterialGroupDto,
  UpdateMaterialGroupDto,
  MaterialGroupResponseDto,
  LinkMaterialToGroupDto,
} from '../dto/material-group.dto';

@ApiTags('Группы материалов')
@Controller('settings/material-groups')
export class MaterialGroupsController {
  constructor(private readonly materialGroupsService: MaterialGroupsService) {}

  @Post()
  @ApiOperation({ summary: 'Создать группу материалов' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Группа материалов успешно создана',
    type: MaterialGroupResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Группа материалов с таким названием уже существует',
  })
  async create(
    @Body() createMaterialGroupDto: CreateMaterialGroupDto,
  ): Promise<MaterialGroupResponseDto> {
    return this.materialGroupsService.create(createMaterialGroupDto);
  }

  @Get()
  @ApiOperation({ summary: 'Получить все группы материалов' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список всех групп материалов',
    type: [MaterialGroupResponseDto],
  })
  async findAll(): Promise<MaterialGroupResponseDto[]> {
    return this.materialGroupsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить группу материалов по ID' })
  @ApiParam({ name: 'id', description: 'ID группы материалов' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Группа материалов найдена',
    type: MaterialGroupResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Группа материалов не найдена',
  })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<MaterialGroupResponseDto> {
    return this.materialGroupsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Обновить группу материалов' })
  @ApiParam({ name: 'id', description: 'ID группы материалов' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Группа материалов успешно обновлена',
    type: MaterialGroupResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Группа материалов не найдена',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Группа материалов с таким названием уже существует',
  })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateMaterialGroupDto: UpdateMaterialGroupDto,
  ): Promise<MaterialGroupResponseDto> {
    return this.materialGroupsService.update(id, updateMaterialGroupDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Удалить группу материалов' })
  @ApiParam({ name: 'id', description: 'ID группы материалов' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Группа материалов успешно удалена',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Группа материалов не найдена',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Нельзя удалить группу, в которой есть материалы',
  })
  async remove(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.materialGroupsService.remove(id);
  }

  @Post('link')
  @ApiOperation({ summary: 'Привязать материал к группе' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Материал успешно привязан к группе',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Группа или материал не найдены',
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'Материал уже привязан к этой группе',
  })
  async linkMaterialToGroup(
    @Body() linkDto: LinkMaterialToGroupDto,
  ): Promise<void> {
    return this.materialGroupsService.linkMaterialToGroup(linkDto);
  }

  @Post('unlink')
  @ApiOperation({ summary: 'Отвязать материал от группы' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Матер��ал успешно отвязан от группы',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Связь между материалом и группой не найдена',
  })
  async unlinkMaterialFromGroup(
    @Body() linkDto: LinkMaterialToGroupDto,
  ): Promise<void> {
    return this.materialGroupsService.unlinkMaterialFromGroup(linkDto);
  }

  @Get(':id/materials')
  @ApiOperation({ summary: 'Получить все материалы в группе' })
  @ApiParam({ name: 'id', description: 'ID группы материалов' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список материалов в группе',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Группа материалов не найдена',
  })
  async getMaterialsInGroup(@Param('id', ParseIntPipe) id: number) {
    return this.materialGroupsService.getMaterialsInGroup(id);
  }
}
