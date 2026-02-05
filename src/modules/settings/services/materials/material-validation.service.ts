import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';

export interface MaterialValidationResult {
  code: string;
  name: string;
  exists: boolean;
  existingMaterial?: {
    materialId: number;
    materialName: string;
    article: string;
    unit: string;
  };
}

@Injectable()
export class MaterialValidationService {
  constructor(private readonly prismaService: PrismaService) {}

  async validateMaterials(materials: Array<{ code: string; name: string }>): Promise<MaterialValidationResult[]> {
    const results: MaterialValidationResult[] = [];

    for (const material of materials) {
      const existing = await this.prismaService.material.findFirst({
        where: { article: material.code },
      });

      if (existing) {
        results.push({
          code: material.code,
          name: material.name,
          exists: true,
          existingMaterial: {
            materialId: existing.materialId,
            materialName: existing.materialName,
            article: existing.article,
            unit: existing.unit,
          },
        });
      } else {
        results.push({
          code: material.code,
          name: material.name,
          exists: false,
        });
      }
    }

    return results;
  }
}
