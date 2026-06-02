import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class CustomOrderParserService {
  /**
   * Парсит Excel файл с деталями для индивидуального производства
   * Парсит все колонки согласно структуре CustomOrderPart
   */
  async parseFile(path: string): Promise<any[]> {
    const workbook = XLSX.readFile(path, { cellDates: true });
    const firstSheetName = workbook.SheetNames[0];

    if (!firstSheetName) {
      throw new BadRequestException('В файле нет листов');
    }

    const sheet = workbook.Sheets[firstSheetName];
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });

    if (rows.length < 2) {
      throw new BadRequestException('Недостаточно строк в таблице');
    }

    // Ищем строку с заголовками (первая непустая строка)
    let headerRowIdx = 0;
    const headerRow = rows[headerRowIdx];

    if (!headerRow || headerRow.length === 0) {
      throw new BadRequestException('Не найдена строка с заголовками');
    }

    // Создаем маппинг колонок по их названиям
    const columnMap: { [key: string]: number } = {};
    headerRow.forEach((header: any, index: number) => {
      if (header) {
        const headerStr = String(header).trim();
        columnMap[headerStr] = index;
      }
    });

    const result: any[] = [];

    // Парсим данные начиная со второй строки
    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];

      if (!row || row.length === 0) {
        continue;
      }

      // Проверяем наличие хотя бы названия детали
      const partName = row[columnMap['Наименование детали']];
      if (!partName) {
        continue;
      }

      // Собираем все данные детали
      const partData: any = {
        partSku: row[columnMap['Артикул детали']] || null,
        partName: String(partName).trim(),
        partCode: row[columnMap['Код детали']] || null,
        materialName: row[columnMap['Наименование материала']] || '',
        materialSku: row[columnMap['Артикул материала']] || '',
        thickness: row[columnMap['Толщина детали']] || null,
        thicknessWithEdging:
          row[columnMap['Толщина с учетом облицовки пласти']] || null,
        quantity: row[columnMap['Количество']] || 0,
        blankLength: row[columnMap['Заготовка [L]']] || null,
        blankWidth: row[columnMap['Заготовка [W]']] || null,
        finishedLength: row[columnMap['Готовая деталь [L]']] || null,
        finishedWidth: row[columnMap['Готовая деталь [W]']] || null,
        groove: row[columnMap['Паз']] || null,
        edgingSkuL1: row[columnMap['Артикул облицовки кромки [L1]']] || null,
        edgingNameL1:
          row[columnMap['Обозначение облицовки кромки [L1]']] || null,
        edgingSkuL2: row[columnMap['Артикул облицовки кромки [L2]']] || null,
        edgingNameL2:
          row[columnMap['Обозначение облицовки кромки [L2]']] || null,
        edgingSkuW1: row[columnMap['Артикул облицовки кромки [W1]']] || null,
        edgingNameW1:
          row[columnMap['Обозначение облицовки кромки [W1]']] || null,
        edgingSkuW2: row[columnMap['Артикул облицовки кромки [W2]']] || null,
        edgingNameW2:
          row[columnMap['Обозначение облицовки кромки [W2]']] || null,
        plasticFace: row[columnMap['Пластик (лицевая)']] || null,
        plasticFaceSku: row[columnMap['Пластик (лицевая) артикул']] || null,
        plasticBack: row[columnMap['Пластик (нелицевая)']] || null,
        plasticBackSku: row[columnMap['Пластик (нелицевая) артикул']] || null,
        additionalMaterial: row[columnMap['Дополнительный материал']] || null,
        pf: row[columnMap['ПФ']] || null,
        pfSku: row[columnMap['Артикул ПФ (для детали)']] || null,
        sbPart: row[columnMap['СБ деталь']] || null,
        pfSb: row[columnMap['ПФ СБ']] || null,
        sbPartSku: row[columnMap['Артикул СБ детали (для ПФ СБ)']] || null,
        conveyorPosition:
          row[columnMap['Подстопное место на конвейере']] || null,
      };

      // Валидация количества
      const quantity = parseFloat(String(partData.quantity).replace(',', '.'));
      if (isNaN(quantity) || quantity <= 0) {
        continue; // Пропускаем строки с некорректным количеством
      }

      partData.quantity = quantity;

      result.push(partData);
    }

    if (result.length === 0) {
      throw new BadRequestException(
        'Не найдено ни одной корректной строки с данными',
      );
    }

    return result;
  }
}
