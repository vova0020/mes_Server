import { Injectable } from '@nestjs/common';

@Injectable()
export class CustomOrderValidationService {
  /**
   * Для индивидуального производства валидация не требуется
   * Детали сохраняются напрямую из файла в CustomOrderPart
   * Возвращает данные в формате для фронтенда
   */
  async validateParts(parsedParts: any[]): Promise<{
    parts: any[];
    missingParts: string[];
    allExist: boolean;
  }> {
    // Для индивидуального производства все детали считаются валидными
    const parts = parsedParts.map((parsed) => ({
      code: parsed.code,
      name: parsed.name,
      quantity: parsed.quantity,
      exists: true, // Всегда true для индивидуального производства
    }));

    return {
      parts,
      missingParts: [],
      allExist: true,
    };
  }
}
