// src/parser/parser.service.ts

import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class ParserService {
  // Наш маппинг «русское имя столбца» → «английское имя в результате»
  private readonly columnMap: Record<string, string> = {
    'Артикул детали': 'partSku',
    'Наименование детали': 'partName',
    'Наименование материала': 'materialName',
    'Артикул материала': 'materialSku',
    'Толщина детали': 'thickness',
    'Толщина с учетом облицовки пласти': 'thicknessWithEdging',
    'Количество': 'quantity',
    'Готовая деталь [L]': 'finishedLength',
    'Готовая деталь [W]': 'finishedWidth',
    'Паз': 'groove',
    'Артикул облицовки кромки [L1]': 'edgingSkuL1',
    'Наименование облицовки кромки [L1]': 'edgingNameL1',
    'Артикул облицовки кромки [L2]': 'edgingSkuL2',
    'Наименование облицовки кромки [L2]': 'edgingNameL2',
    'Артикул облицовки кромки [W1]': 'edgingSkuW1',
    'Наименование облицовки кромки [W1]': 'edgingNameW1',
    'Артикул облицовки кромки [W2]': 'edgingSkuW2',
    'Наименование облицовки кромки [W2]': 'edgingNameW2',
    'Пластик (лицевая)': 'plasticFace',
    'Пластик (лицевая) артикул': 'plasticFaceSku',
    'Пластик (нелицевая)': 'plasticBack',
    'Пластик (нелицевая) артикул': 'plasticBackSku',
    'ПФ': 'pf',
    'Артикул ПФ (для детали)': 'pfSku',
    'СБ деталь': 'sbPart',
    'ПФ СБ': 'pfSb',
    'Артикул СБ детали (для ПФ СБ)': 'sbPartSku',
    'Упаковка': 'packaging',
    'Артикул упаковки': 'packagingSku',
    'Подстопное место на конвейере': 'conveyorPosition',
  };

  // Для поиска заголовков нам нужен список русских имён
  private get wantedColumns(): string[] {
    return Object.keys(this.columnMap);
  }

  /**
   * @param path — путь к .xls/.xlsx
   */
  async parseFile(path: string): Promise<any[]> {
    // 1. Читаем книгу
    const workbook = XLSX.readFile(path, { cellDates: true });
    const firstSheetName = workbook.SheetNames[0];
    if (!firstSheetName) {
      throw new BadRequestException('В файле нет листов');
    }
    const sheet = workbook.Sheets[firstSheetName];

    // 2. Получаем все строки как матрицу
    const rows: any[][] = XLSX.utils.sheet_to_json(sheet, { header: 1 });
    if (rows.length < 2) {
      throw new BadRequestException('Недостаточно строк в таблице');
    }

    // 3. Ищем строку‑заголовок в первых 10 строках
    const wantedLower = this.wantedColumns.map((h) => h.toLowerCase());
    let headerRowIdx: number | null = null;
    let headerRow: string[] = [];

    for (let i = 0; i < Math.min(rows.length, 10); i++) {
      const row = rows[i].map((cell) =>
        (cell || '').toString().trim().toLowerCase(),
      );
      if (wantedLower.every((want) => row.includes(want))) {
        headerRowIdx = i;
        headerRow = row;
        break;
      }
    }
    if (headerRowIdx === null) {
      throw new BadRequestException(
        `Не найдена строка с заголовками: ${this.wantedColumns.join(', ')}`,
      );
    }

    // 4. Строим карту «lowercase‑заголовок → индекс»
    const colIndexMap: Record<string, number> = {};
    headerRow.forEach((h, idx) => {
      if (h) colIndexMap[h] = idx;
    });

    // 5. Парсим строки до первой полностью пустой
    const result: any[] = [];
    let sawData = false;

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];

      // Проверяем, есть ли в пределах headerRow хоть одна непустая ячейка:
      const hasAny = headerRow
        .map((_, idx) => row[idx])
        .some((cell) => cell !== null && cell !== undefined && cell !== '');

      if (!hasAny) {
        if (!sawData) continue; // пропускаем пустые перед началом данных
        break; // после данных — стоп
      }
      sawData = true;

      // Собираем объект, но уже с английскими ключами:
      const obj: Record<string, any> = {};
      for (const [rusName, engName] of Object.entries(this.columnMap)) {
        const idx = colIndexMap[rusName.toLowerCase()];
        obj[engName] = row[idx] ?? null;
      }
      result.push(obj);
    }

    return result;
  }
}
