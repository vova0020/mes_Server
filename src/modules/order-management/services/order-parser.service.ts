import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class OrderParserService {
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

    let headerRowIdx: number | null = null;
    let codeColIdx: number | null = null;
    let nameColIdx: number | null = null;
    let quantityColIdx: number | null = null;

    // Ищем заголовки в первых 40 строках
    for (let i = 0; i < Math.min(rows.length, 40); i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      const foundIndices = { code: -1, name: -1, quantity: -1 };
      
      for (let j = 0; j < row.length; j++) {
        const cellValue = (row[j] || '').toString().trim().toLowerCase();
        
        // Ищем колонку "Код" или "Артикул"
        if ((cellValue === 'код' || cellValue === 'артикул' || 
            (cellValue.includes('код') && cellValue.length < 10) || 
            (cellValue.includes('артикул') && cellValue.length < 15)) && foundIndices.code === -1) {
          foundIndices.code = j;
        }
        
        // Ищем колонку "Наименование" или "Наименование номенклатуры"
        if ((cellValue === 'наименование' || 
            cellValue === 'наименование номенклатуры' ||
            (cellValue.includes('наименование') && cellValue.length < 30)) && foundIndices.name === -1) {
          foundIndices.name = j;
        }
        
        // Ищем колонку "Кол-во" или "Количество"
        if ((cellValue === 'кол-во' || cellValue === 'количество' ||
            cellValue === 'кол во' || cellValue === 'кол.во' ||
            (cellValue.includes('количество') && cellValue.length < 15) ||
            (cellValue.includes('кол') && cellValue.length < 10)) && foundIndices.quantity === -1) {
          foundIndices.quantity = j;
        }
      }
      
      // Проверяем, что нашли все три колонки
      if (foundIndices.code !== -1 && foundIndices.name !== -1 && foundIndices.quantity !== -1) {
        headerRowIdx = i;
        codeColIdx = foundIndices.code;
        nameColIdx = foundIndices.name;
        quantityColIdx = foundIndices.quantity;
        break;
      }
    }
    
    if (headerRowIdx === null || codeColIdx === null || nameColIdx === null || quantityColIdx === null) {
      throw new BadRequestException('Не найдена строка с заголовками (Код/Артикул, Наименование, Кол-во/Количество)');
    }

    const result: any[] = [];

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      
      const code = row[codeColIdx];
      const name = row[nameColIdx];
      const quantity = row[quantityColIdx];
      
      // Прекращаем парсинг если все три поля пустые
      if (!code && !name && !quantity) {
        break;
      }
      
      // Добавляем только если есть код, название и количество
      if (code && name && quantity) {
        const parsedQuantity = parseFloat(String(quantity).replace(',', '.'));
        
        if (isNaN(parsedQuantity) || parsedQuantity <= 0) {
          continue; // Пропускаем строки с некорректным количеством
        }
        
        result.push({
          code: String(code).trim(),
          name: String(name).trim(),
          quantity: parsedQuantity,
        });
      }
    }

    if (result.length === 0) {
      throw new BadRequestException('Не найдено ни одной корректной строки с данными');
    }

    return result;
  }
}
