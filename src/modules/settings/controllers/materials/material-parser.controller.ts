import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
  Get,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { unlink } from 'fs/promises';
import { MaterialParserService } from '../../services/materials/material-parser.service';
import { MaterialsManagementService } from '../../services/materials/materials-management.service';
import { MaterialValidationService } from '../../services/materials/material-validation.service';
import { UploadMaterialFileDto } from '../../dto/material/upload-material-file.dto';
import { SaveMaterialsFromFileDto } from '../../dto/material/material-from-file.dto';

@Controller('settings/materials')
export class MaterialParserController {
  constructor(
    private readonly parserService: MaterialParserService,
    private readonly materialsService: MaterialsManagementService,
    private readonly validationService: MaterialValidationService,
  ) {}

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          cb(null, `${randomName}${extname(file.originalname)}`);
        },
      }),
      fileFilter: (req, file, cb) => {
        if (!file.originalname.match(/\.(xls|xlsx)$/)) {
          return cb(
            new BadRequestException('Только Excel файлы разрешены!'),
            false,
          );
        }
        cb(null, true);
      },
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: any,
    @Body() uploadDto: UploadMaterialFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    try {
      const parsed = await this.parserService.parseFile(file.path);
      const validated = await this.validationService.validateMaterials(parsed);

      await unlink(file.path).catch((err) =>
        console.error('Ошибка удаления файла:', err),
      );

      return {
        message: 'Файл успешно обработан',
        filename: file.originalname,
        data: validated,
        groupId: uploadDto.groupId,
      };
    } catch (error) {
      await unlink(file.path).catch((err) =>
        console.error('Ошибка удаления файла:', err),
      );
      throw new BadRequestException(`Ошибка обработки файла: ${error.message}`);
    }
  }

  @Post('save-from-file')
  async saveMaterials(@Body() dto: SaveMaterialsFromFileDto) {
    return this.materialsService.saveMaterials(dto);
  }

  @Get('units')
  async getUnits() {
    return this.materialsService.getUnits();
  }
}
