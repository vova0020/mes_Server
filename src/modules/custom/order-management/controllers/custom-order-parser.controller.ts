import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiConsumes,
} from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { unlink } from 'fs/promises';
import { CustomOrderParserService } from '../services/custom-order-parser.service';
import { CustomOrderFromFileService } from '../services/custom-order-from-file.service';
import { SaveCustomOrderFromFileDto } from '../dto/custom-order-from-file.dto';

@ApiTags('Управление заказами индивидуального производства')
@Controller('custom-order-management')
export class CustomOrderParserController {
  constructor(
    private readonly parserService: CustomOrderParserService,
    private readonly orderFromFileService: CustomOrderFromFileService,
  ) {}

  @Post('upload')
  @ApiOperation({
    summary:
      'Загрузить и распарсить Excel файл для создания заказа индивидуального производства',
    description:
      'Парсит Excel файл с деталями (код/артикул, наименование, кол-во) и возвращает распарсенные данные',
  })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({
    status: 200,
    description: 'Файл успешно обработан',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        filename: { type: 'string' },
        data: {
          type: 'object',
          properties: {
            parts: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  name: { type: 'string' },
                  quantity: { type: 'number' },
                },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка обработки файла',
  })
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

      await unlink(file.path).catch((err) =>
        console.error('Ошибка удаления файла:', err),
      );

      return {
        message: 'Файл успешно обработан',
        filename: file.originalname,
        data: {
          parts: parsed,
        },
      };
    } catch (error) {
      await unlink(file.path).catch((err) =>
        console.error('Ошибка удаления файла:', err),
      );
      throw new BadRequestException(`Ошибка обработки файла: ${error.message}`);
    }
  }

  @Post('save-from-file')
  @ApiOperation({
    summary:
      'Сохранить заказ индивидуального производства из распарсенного файла',
    description:
      'Создает заказ и детали на основе данных из файла (пользователь может изменить данные перед сохранением)',
  })
  @ApiResponse({
    status: 201,
    description: 'Заказ успешно создан',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        customOrderId: { type: 'number' },
        orderNumber: { type: 'string' },
        partsCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка создания заказа',
  })
  async saveOrder(@Body() dto: SaveCustomOrderFromFileDto) {
    return this.orderFromFileService.saveOrder(dto);
  }
}
