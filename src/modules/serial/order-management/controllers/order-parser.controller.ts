import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiConsumes } from '@nestjs/swagger';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { unlink } from 'fs/promises';
import { OrderParserService } from '../services/order-parser.service';
import { OrderValidationService } from '../services/order-validation.service';
import { OrderFromFileService } from '../services/order-from-file.service';
import { SaveOrderFromFileDto } from '../dto/order-from-file.dto';

@ApiTags('Управление заказами')
@Controller('order-management')
export class OrderParserController {
  constructor(
    private readonly parserService: OrderParserService,
    private readonly validationService: OrderValidationService,
    private readonly orderFromFileService: OrderFromFileService,
  ) {}

  @Post('upload')
  @ApiOperation({
    summary: 'Загрузить и распарсить Excel файл для создания заказа',
    description:
      'Парсит Excel файл с упаковками (код/артикул, наименование, кол-во) и проверяет их наличие в базе',
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
            packages: { type: 'array' },
            missingPackages: { type: 'array' },
            allExist: { type: 'boolean' },
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
      const validated = await this.validationService.validatePackages(parsed);

      await unlink(file.path).catch((err) =>
        console.error('Ошибка удаления файла:', err),
      );

      return {
        message: validated.allExist
          ? 'Файл успешно обработан. Все упаковки найдены в базе.'
          : `Файл обработан. Не найдены упаковки: ${validated.missingPackages.join(', ')}`,
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
  @ApiOperation({
    summary: 'Сохранить заказ из распарсенного файла',
    description:
      'Создает заказ на основе данных из файла с проверкой наличия всех упаковок',
  })
  @ApiResponse({
    status: 201,
    description: 'Заказ успешно создан',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        orderId: { type: 'number' },
        batchNumber: { type: 'string' },
        packagesCount: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Ошибка создания заказа (упаковки не найдены или другие ошибки)',
  })
  async saveOrder(@Body() dto: SaveOrderFromFileDto) {
    return this.orderFromFileService.saveOrder(dto);
  }
}
