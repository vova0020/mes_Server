// src/validation/validation.service.ts

import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service'; // настройте импорт под ваш путь и setup

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
  conveyorPosition?: number;

  // наша обертка
  detailExists: boolean;
  packages?: { packageCode: string; packageName: string; quantity: number }[];
  diffs?: Diff[];
  // Поля для связи с упаковкой (из файла)
  packageId?: number;
  quantity?: number;
  // Флаг связи с указанной упаковкой
  hasPackageConnection?: boolean;
  // Доступные маршруты для детали (на основе материала)
  availableRoutes?: { routeId: number; routeName: string }[];
  // Текущий маршрут детали (если деталь уже существует)
  currentRouteId?: number;
}

@Injectable()
export class ValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Проверяет каждый объект по partSku, находит в БД, собирает пакеты и diff’ы.
   */
  async checkAndEnhance(
    items: ValidatedPart[], 
    packageId?: number, 
    // quantity?: number
  ): Promise<ValidatedPart[]> {
    // Если указан packageId, проверяем существование упаковки
    if (packageId) {
      const targetPackage = await this.prisma.packageDirectory.findUnique({
        where: { packageId },
      });
      if (!targetPackage) {
        throw new Error(`Упаковка с ID ${packageId} не найдена`);
      }
    }
    return Promise.all(
      items.map(async (parsed) => {
        const dbDetail = await this.prisma.detailDirectory.findUnique({
          where: { partSku: parsed.partSku },
          include: {
            packageDetails: {
              include: { 
                package: true,
                route: true,
              },
            },
          },
        });

        // Получаем доступные маршруты на основе материала
        const availableRoutes = await this.getAvailableRoutes(parsed.materialSku);

        if (!dbDetail) {
          // Детали нет в каталоге
          return {
            ...parsed,
            detailExists: false,
            packageId,
            quantity: parsed.quantity,
            hasPackageConnection: false,
            availableRoutes,
          };
        }

        // Собираем информацию по связанным пакетам
        const packages = dbDetail.packageDetails.map((pd) => ({
          packageCode: pd.package.packageCode,
          packageName: pd.package.packageName,
          quantity: Number(pd.quantity),
        }));

        // Проверяем связь с указанной упаковкой
        let hasPackageConnection = false;
        if (packageId) {
          hasPackageConnection = dbDetail.packageDetails.some(
            (pd) => pd.packageId === packageId
          );
        }

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
          'quantity',
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
          'conveyorPosition',
        ];

        for (const field of fieldsToCheck) {
          const dbValue = (dbDetail as any)[field];
          const parsedValue = parsed[field];
          // Сравниваем как строки, чтобы null/undefined тоже попадали
          if (`${dbValue ?? ''}` !== `${parsedValue ?? ''}`) {
            diffs.push({ field, dbValue, parsedValue });
          }
        }

        // Получаем текущий маршрут из связи с упаковкой (если есть)
        // Если указан packageId - берем маршрут для этой упаковки
        // Если нет связи с указанной упаковкой - берем из первой найденной
        let currentRouteId: number | undefined;
        if (packageId) {
          const packageConnection = dbDetail.packageDetails.find(pd => pd.packageId === packageId);
          currentRouteId = packageConnection?.routeId ?? dbDetail.packageDetails[0]?.routeId ?? undefined;
        } else {
          currentRouteId = dbDetail.packageDetails[0]?.routeId ?? undefined;
        }

        return {
          ...parsed,
          detailExists: true,
          packages,
          diffs: diffs.length ? diffs : undefined,
          packageId,
          quantity: parsed.quantity,
          hasPackageConnection,
          availableRoutes,
          currentRouteId,
        };
      }),
    );
  }

  /**
   * Получает доступные маршруты для детали на основе материала
   * Материал → Линия → Маршруты
   */
  private async getAvailableRoutes(materialSku?: string): Promise<{ routeId: number; routeName: string }[]> {
    if (!materialSku) {
      return [];
    }

    // Находим материал по артикулу
    const material = await this.prisma.material.findFirst({
      where: { article: materialSku },
      include: {
        lines: {
          include: {
            line: {
              include: {
                routes: {
                  select: {
                    routeId: true,
                    routeName: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!material) {
      return [];
    }

    // Собираем все уникальные маршруты из всех линий, связанных с материалом
    const routesMap = new Map<number, string>();
    material.lines.forEach((lineMaterial) => {
      lineMaterial.line.routes.forEach((route) => {
        routesMap.set(route.routeId, route.routeName);
      });
    });

    return Array.from(routesMap.entries()).map(([routeId, routeName]) => ({
      routeId,
      routeName,
    }));
  }
}
