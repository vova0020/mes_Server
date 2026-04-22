// src/parser/parser.controller.ts

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
import { ParserService } from '../services/parser.service';
import { ValidationService } from '../services/validation.service';
import { UploadFileDto } from '../dto/upload-file.dto';

@Controller('parser')
export class ParserController {
  constructor(
    private readonly parserService: ParserService,
    private readonly validationService: ValidationService,
  ) {}

  /**
   * POST /parser/upload
   * Принимает файл с фронтенда, парсит и валидирует
   */
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
        fileSize: 10 * 1024 * 1024, // 10MB
      },
    }),
  )
  async uploadFile(
    @UploadedFile() file: any,
    @Body() uploadDto: UploadFileDto,
  ) {
    if (!file) {
      throw new BadRequestException('Файл не загружен');
    }

    try {
      // 1. Парсим загруженный Excel файл
      const parsed = await this.parserService.parseFile(file.path);

      // 2. Отправляем на валидацию и получение различий/связей
      const checked = await this.validationService.checkAndEnhance(
        parsed,
        uploadDto.packageId,
        // uploadDto.quantity,
      );

      // 3. Удаляем файл после обработки
      await unlink(file.path).catch((err) =>
        console.error('Ошибка удаления файла:', err),
      );

      // 4. Возвращаем клиенту результат
      return {
        message: 'Файл успешно обработан',
        filename: file.originalname,
        data: checked,
        packageId: uploadDto.packageId,
        // quantity: uploadDto.quantity,
      };
    } catch (error) {
      // Удаляем файл даже при ошибке
      await unlink(file.path).catch((err) =>
        console.error('Ошибка удаления файла:', err),
      );
      throw new BadRequestException(`Ошибка обработки файла: ${error.message}`);
    }
  }
} 