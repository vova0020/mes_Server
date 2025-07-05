// src/validation/validation.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service'; // настройте импорт под ваш путь и setup

export interface Diff {
  field: string;
  dbValue: any;
  parsedValue: any;
}

export interface ValidatedPart {
  partSku: string;
  partName: string;
  materialName?: string;
  materialSku?: string;
  thickness?: number;
  thicknessWithEdging?: number;
  finishedLength?: number;
  finishedWidth?: number;
  groove?: string;
  edgingSkuL1?: string;
  edgingNameL1?: string;
  edgingSkuL2?: string;
  edgingNameL2?: string;
  edgingSkuW1?: string;
  edgingNameW1?: string;
  edgingSkuW2?: string;
  edgingNameW2?: string;
  plasticFace?: string;
  plasticFaceSku?: string;
  plasticBack?: string;
  plasticBackSku?: string;
  pf?: boolean;
  pfSku?: string;
  sbPart?: boolean;
  pfSb?: boolean;
  sbPartSku?: string;

  // наша обертка
  detailExists: boolean;
  packages?: { packageCode: string; packageName: string; quantity: number }[];
  diffs?: Diff[];
}

@Injectable()
export class ValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Проверяет каждый объект по partSku, находит в БД, собирает пакеты и diff’ы.
   */
  async checkAndEnhance(items: ValidatedPart[]): Promise<ValidatedPart[]> {
    return Promise.all(
      items.map(async (parsed) => {
        const dbDetail = await this.prisma.detailDirectory.findUnique({
          where: { partSku: parsed.partSku },
          include: {
            packageDetails: {
              include: { package: true },
            },
          },
        });

        if (!dbDetail) {
          // Детальа нет в каталоге
          return {
            ...parsed,
            detailExists: false,
          };
        }

        // Собираем информацию по связанным пакетам
        const packages = dbDetail.packageDetails.map((pd) => ({
          packageCode: pd.package.packageCode,
          packageName: pd.package.packageName,
          quantity: pd.quantity,
        }));

        // Смотрим отличия по каждому полю (кроме partSku)
        const diffs: Diff[] = [];
        // Перечисляем поля, которые могут меняться
        const fieldsToCheck: Array<keyof ValidatedPart> = [
          'partName',
          'materialName',
          'materialSku',
          'thickness',
          'thicknessWithEdging',
          'finishedLength',
          'finishedWidth',
          'groove',
          'edgingSkuL1',
          'edgingNameL1',
          'edgingSkuL2',
          'edgingNameL2',
          'edgingSkuW1',
          'edgingNameW1',
          'edgingSkuW2',
          'edgingNameW2',
          'plasticFace',
          'plasticFaceSku',
          'plasticBack',
          'plasticBackSku',
          'pf',
          'pfSku',
          'sbPart',
          'pfSb',
          'sbPartSku',
        ];

        for (const field of fieldsToCheck) {
          const dbValue = (dbDetail as any)[field];
          const parsedValue = parsed[field];
          // Сравниваем как строки, чтобы null/undefined тоже попадали
          if (`${dbValue ?? ''}` !== `${parsedValue ?? ''}`) {
            diffs.push({ field, dbValue, parsedValue });
          }
        }

        return {
          ...parsed,
          detailExists: true,
          packages,
          diffs: diffs.length ? diffs : undefined,
        };
      }),
    );
  }
}
