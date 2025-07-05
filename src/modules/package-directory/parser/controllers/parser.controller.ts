// src/parser/parser.controller.ts

import { Controller, Post } from '@nestjs/common';
import { ParserService } from '../services/parser.service';
import { ValidationService } from '../services/validation.service'; // <-- путь к вашему сервису проверок

@Controller('parser')
export class ParserController {
  constructor(
    private readonly parserService: ParserService,
    private readonly validationService: ValidationService, // <-- инжектим валидатор
  ) {}

  /**
   * POST /parser/local
   * Без тела: парсим заранее заданный файл, валидируем данные, и отдаём с дополнениями
   */
  @Post('local')
  async parseLocal() {
    const filePath = process.cwd() + '/testFile.xls';

    // 1. Парсим Excel
    const parsed = await this.parserService.parseFile(filePath);

    // 2. Отправляем на валидацию и получение различий/связей
    const checked = await this.validationService.checkAndEnhance(parsed);

    // 3. Возвращаем клиенту результат
    return { data: checked };
  }
}
