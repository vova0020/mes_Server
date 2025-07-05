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
import { PackageDirectoryService } from '../services/package-directory.service';
import {
  CreatePackageDirectoryDto,
  UpdatePackageDirectoryDto,
} from '../dto/package-directory.dto';

@Controller('package-directory')
export class PackageDirectoryController {
  constructor(
    private readonly packageDirectoryService: PackageDirectoryService,
  ) {}

  /**
   * POST /package-directory
   * Создание новой упаковки
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createPackageDirectoryDto: CreatePackageDirectoryDto) {
    return this.packageDirectoryService.create(createPackageDirectoryDto);
  }

  /**
   * GET /package-directory
   * Получение всех упаковок
   */
  @Get()
  async findAll() {
    return this.packageDirectoryService.findAll();
  }

  /**
   * GET /package-directory/:id
   * Получение упаковки по ID
   */
  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.packageDirectoryService.findOne(id);
  }

  /**
   * PATCH /package-directory/:id
   * Обновление упаковки
   */
  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updatePackageDirectoryDto: UpdatePackageDirectoryDto,
  ) {
    return this.packageDirectoryService.update(id, updatePackageDirectoryDto);
  }

  /**
   * DELETE /package-directory/:id
   * Удаление упаковки
   */
  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.packageDirectoryService.remove(id);
  }
}
