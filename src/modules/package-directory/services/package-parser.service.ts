import { Injectable, BadRequestException } from '@nestjs/common';
import * as XLSX from 'xlsx';

@Injectable()
export class PackageParserService {
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

    for (let i = 0; i < Math.min(rows.length, 20); i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;
      
      for (let j = 0; j < row.length; j++) {
        const cellValue = (row[j] || '').toString().trim().toLowerCase();
        
        if (cellValue === 'код' || cellValue === 'артикул' || 
            cellValue.includes('код') && cellValue.length < 10 || 
            cellValue.includes('артикул') && cellValue.length < 15) {
          for (let k = j + 1; k < Math.min(row.length, j + 5); k++) {
            const nextCell = (row[k] || '').toString().trim().toLowerCase();
            if (nextCell === 'наименование' || 
                nextCell.includes('наименование') && nextCell.length < 20) {
              headerRowIdx = i;
              codeColIdx = j;
              nameColIdx = k;
              break;
            }
          }
          if (headerRowIdx !== null) break;
        }
      }
      if (headerRowIdx !== null) break;
    }
    
    if (headerRowIdx === null || codeColIdx === null || nameColIdx === null) {
      throw new BadRequestException('Не найдена строка с заголовками (Код/Артикул, Наименование)');
    }

    const result: any[] = [];

    for (let i = headerRowIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      
      const code = row[codeColIdx];
      const name = row[nameColIdx];
      
      if (!code && !name) {
        break;
      }
      
      if (code && name) {
        result.push({
          code: String(code).trim(),
          name: String(name).trim(),
        });
      }
    }

    return result;
  }
}
