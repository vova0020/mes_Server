import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { unlink } from 'fs/promises';
import { PackageParserService } from '../services/package-parser.service';
import { PackagesManagementService } from '../services/packages-management.service';
import { PackageValidationService } from '../services/package-validation.service';
import { SavePackagesFromFileDto } from '../dto/package-from-file.dto';

@Controller('package-directory')
export class PackageParserController {
  constructor(
    private readonly parserService: PackageParserService,
    private readonly packagesService: PackagesManagementService,
    private readonly validationService: PackageValidationService,
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
  async uploadFile(@UploadedFile() file: any) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    try {
      const parsed = await this.parserService.parseFile(file.path);
      const validated = await this.validationService.validatePackages(parsed);

      await unlink(file.path).catch((err) =>
        console.error('Ошибка удаления файла:', err),
      );

      return {
        message: 'Файл успешно обработан',
        filename: file.originalname,
        data: validated,
      };
    } catch (error) {
      await unlink(file.path).catch((err) =>
        console.error('Ошибка удаления файла:', err),
      );
      throw new BadRequestException(`Ошибка обработки файла: ${error.message}`);
    }
  }

  @Post('save-from-file')
  async savePackages(@Body() dto: SavePackagesFromFileDto) {
    return this.packagesService.savePackages(dto);
  }
}
