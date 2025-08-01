import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';
import { DetailDirectory, PackageDetailDirectory } from '@prisma/client';
import { CreateDetailWithPackageDto } from '../dto/create-detail-with-package.dto';
import { DetailFromFileDto } from '../dto/save-details-from-file.dto';

export interface DetailWithPackages extends DetailDirectory {
  packageDetails: Array<
    PackageDetailDirectory & {
      package: {
        packageCode: string;
        packageName: string;
      };
    }
  >;
  quantity?: number; // Количество деталей в конкретной упаковке
}

@Injectable()
export class DetailsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Удаляет undefined значения из объекта для корректной работы с Prisma
   */
  private cleanData<T extends Record<string, any>>(data: T): Partial<T> {
    const cleaned = Object.fromEntries(
      Object.entries(data).filter(([_, value]) => value !== undefined)
    );
    return cleaned as Partial<T>;
  }

  /**
   * Подготавливает данные детали для создания в Prisma
   */
  private prepareDetailData(data: any) {
    const cleanedData = this.cleanData(data);
    
    // Убеждаемся, что обязательные поля присутствуют
    if (!cleanedData.partSku || !cleanedData.partName) {
      throw new BadRequestException('Обязательные поля partSku и partName должны быть заполнены');
    }

    // Создаем объект с правильными типами дл�� Prisma
    const result: any = {
      partSku: cleanedData.partSku,
      partName: cleanedData.partName,
      materialName: cleanedData.materialName || '',
      materialSku: cleanedData.materialSku || '',
    };

    // Добавляем опциональные поля только если они определены
    if (cleanedData.thickness !== undefined) result.thickness = cleanedData.thickness;
    if (cleanedData.thicknessWithEdging !== undefined) result.thicknessWithEdging = cleanedData.thicknessWithEdging;
    if (cleanedData.finishedLength !== undefined) result.finishedLength = cleanedData.finishedLength;
    if (cleanedData.finishedWidth !== undefined) result.finishedWidth = cleanedData.finishedWidth;
    if (cleanedData.groove !== undefined) result.groove = cleanedData.groove;
    if (cleanedData.edgingSkuL1 !== undefined) result.edgingSkuL1 = cleanedData.edgingSkuL1;
    if (cleanedData.edgingNameL1 !== undefined) result.edgingNameL1 = cleanedData.edgingNameL1;
    if (cleanedData.edgingSkuL2 !== undefined) result.edgingSkuL2 = cleanedData.edgingSkuL2;
    if (cleanedData.edgingNameL2 !== undefined) result.edgingNameL2 = cleanedData.edgingNameL2;
    if (cleanedData.edgingSkuW1 !== undefined) result.edgingSkuW1 = cleanedData.edgingSkuW1;
    if (cleanedData.edgingNameW1 !== undefined) result.edgingNameW1 = cleanedData.edgingNameW1;
    if (cleanedData.edgingSkuW2 !== undefined) result.edgingSkuW2 = cleanedData.edgingSkuW2;
    if (cleanedData.edgingNameW2 !== undefined) result.edgingNameW2 = cleanedData.edgingNameW2;
    if (cleanedData.plasticFace !== undefined) result.plasticFace = cleanedData.plasticFace;
    if (cleanedData.plasticFaceSku !== undefined) result.plasticFaceSku = cleanedData.plasticFaceSku;
    if (cleanedData.plasticBack !== undefined) result.plasticBack = cleanedData.plasticBack;
    if (cleanedData.plasticBackSku !== undefined) result.plasticBackSku = cleanedData.plasticBackSku;
    if (cleanedData.pf !== undefined) result.pf = cleanedData.pf;
    if (cleanedData.pfSku !== undefined) result.pfSku = cleanedData.pfSku;
    if (cleanedData.sbPart !== undefined) result.sbPart = cleanedData.sbPart;
    if (cleanedData.pfSb !== undefined) result.pfSb = cleanedData.pfSb;
    if (cleanedData.sbPartSku !== undefined) result.sbPartSku = cleanedData.sbPartSku;
    if (cleanedData.conveyorPosition !== undefined) result.conveyorPosition = cleanedData.conveyorPosition;

    return result;
  }

  /**
   * Получить все детали связанные с упаковкой по ID упаковки
   */
  async getDetailsByPackageId(
    packageId: number,
  ): Promise<DetailWithPackages[]> {
    const packageWithDetails = await this.prisma.packageDirectory.findUnique({
      where: { packageId },
      include: {
        packageDetails: {
          include: {
            detail: {
              include: {
                packageDetails: {
                  include: {
                    package: {
                      select: {
                        packageCode: true,
                        packageName: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!packageWithDetails) {
      throw new NotFoundException(`Упаковка с ID ${packageId} не найдена`);
    }

    return packageWithDetails.packageDetails.map((pd) => ({
      ...pd.detail,
      quantity: pd.quantity, // Добавляем количество деталей в упаковке
    }));
  }

  /**
   * Обновить деталь
   */
  async updateDetail(
    id: number,
    updateDetailDto: any,
  ): Promise<DetailDirectory> {
    // Проверяем существование детали
    const existingDetail = await this.prisma.detailDirectory.findUnique({
      where: { id },
    });

    if (!existingDetail) {
      throw new NotFoundException(`Деталь с ID ${id} не найдена`);
    }

    // Если обновляется артикул, проверяем уникальность
    if (
      updateDetailDto.partSku &&
      updateDetailDto.partSku !== existingDetail.partSku
    ) {
      const duplicateDetail = await this.prisma.detailDirectory.findUnique({
        where: { partSku: updateDetailDto.partSku },
      });

      if (duplicateDetail) {
        throw new BadRequestException(
          `Деталь с артикулом ${updateDetailDto.partSku} уже существует`,
        );
      }
    }

    return this.prisma.detailDirectory.update({
      where: { id },
      data: updateDetailDto,
    });
  }

  /**
   * Удалить деталь
   */
  async deleteDetail(id: number): Promise<void> {
    // Проверяем существование детали
    const existingDetail = await this.prisma.detailDirectory.findUnique({
      where: { id },
      include: {
        packageDetails: true,
      },
    });

    if (!existingDetail) {
      throw new NotFoundException(`Деталь с ID ${id} не найдена`);
    }

    // Проверяем, есть ли связи с упаковками
    if (existingDetail.packageDetails.length > 0) {
      throw new BadRequestException(
        `Нельзя удалить деталь, так как она связана с ${existingDetail.packageDetails.length} упаковками. Сначала удалите связи.`,
      );
    }

    await this.prisma.detailDirectory.delete({
      where: { id },
    });
  }

  /**
   * Создать новую деталь с привязкой к упаковке
   */
  async createDetailWithPackage(
    createDetailDto: CreateDetailWithPackageDto,
  ): Promise<DetailDirectory> {
    const { packageId, quantity, ...detailData } = createDetailDto;

    // Проверяем существование упаковки
    const packageExists = await this.prisma.packageDirectory.findUnique({
      where: { packageId },
    });

    if (!packageExists) {
      throw new NotFoundException(`Упаковка с ID ${packageId} не найдена`);
    }

    // Проверяем, что деталь с таким артикулом не существует
    const existingDetail = await this.prisma.detailDirectory.findUnique({
      where: { partSku: detailData.partSku },
    });

    if (existingDetail) {
      // Если деталь уже существует, проверяем связь с упаковкой
      const existingConnection = await this.prisma.packageDetailDirectory.findUnique({
        where: {
          packageId_detailId: {
            packageId,
            detailId: existingDetail.id,
          },
        },
      });

      if (existingConnection) {
        throw new BadRequestException(
          `Деталь с артикулом ${detailData.partSku} уже связана с упаковкой ${packageExists.packageCode}`,
        );
      }

      // Создаем новую связь с упаковкой
      await this.prisma.packageDetailDirectory.create({
        data: {
          packageId,
          detailId: existingDetail.id,
          quantity,
        },
      });

      return existingDetail;
    }

    // Создаем новую деталь и связь с упаковкой в транзакции
    return this.prisma.$transaction(async (tx) => {
      const newDetail = await tx.detailDirectory.create({
        data: this.prepareDetailData(detailData),
      });

      await tx.packageDetailDirectory.create({
        data: {
          packageId,
          detailId: newDetail.id,
          quantity,
        },
      });

      return newDetail;
    });
  }

  /**
   * Сохранить детали из файла с привязкой к упаковкам
   */
  async saveDetailsFromFile(
    packageId: number,
    details: DetailFromFileDto[]
  ): Promise<{
    created: number;
    updated: number;
    connected: number;
  }> {
    let created = 0;
    let updated = 0;
    let connected = 0;

    // Проверяем существование упаковки один раз для всех деталей
    const packageExists = await this.prisma.packageDirectory.findUnique({
      where: { packageId },
    });

    if (!packageExists) {
      throw new NotFoundException(`Упаковка с ID ${packageId} не найдена`);
    }

    for (const detailData of details) {
      const { quantity, ...detailFields } = detailData;

      // Ищем существующую деталь
      const existingDetail = await this.prisma.detailDirectory.findUnique({
        where: { partSku: detailFields.partSku },
      });

      if (existingDetail) {
        // Проверяем связь с упаковкой
        const existingConnection = await this.prisma.packageDetailDirectory.findUnique({
          where: {
            packageId_detailId: {
              packageId,
              detailId: existingDetail.id,
            },
          },
        });

        if (!existingConnection) {
          // Создаем новую связь с упаковкой
          await this.prisma.packageDetailDirectory.create({
            data: {
              packageId,
              detailId: existingDetail.id,
              quantity,
            },
          });
          connected++;
        } else {
          // Обновляем количество в существующей связи
          await this.prisma.packageDetailDirectory.update({
            where: {
              packageId_detailId: {
                packageId,
                detailId: existingDetail.id,
              },
            },
            data: { quantity },
          });
        }

        // Обновляем данные детали (если есть изменения)
        const hasChanges = Object.keys(detailFields).some(
          (key) => (existingDetail as any)[key] !== (detailFields as any)[key],
        );

        if (hasChanges) {
          await this.prisma.detailDirectory.update({
            where: { id: existingDetail.id },
            data: detailFields,
          });
          updated++;
        }
      } else {
        // Создаем новую деталь и связь с упаковкой
        await this.prisma.$transaction(async (tx) => {
          const newDetail = await tx.detailDirectory.create({
            data: this.prepareDetailData(detailFields),
          });

          await tx.packageDetailDirectory.create({
            data: {
              packageId,
              detailId: newDetail.id,
              quantity,
            },
          });
        });
        created++;
      }
    }

    return { created, updated, connected };
  }
}
