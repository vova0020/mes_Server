import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';

export interface OrderPackageValidationResult {
  code: string;
  name: string;
  quantity: number;
  exists: boolean;
  existingPackage?: {
    packageId: number;
    packageCode: string;
    packageName: string;
  };
}

@Injectable()
export class OrderValidationService {
  constructor(private readonly prisma: PrismaService) {}

  async validatePackages(
    packages: Array<{ code: string; name: string; quantity: number }>,
  ): Promise<{
    packages: OrderPackageValidationResult[];
    missingPackages: string[];
    allExist: boolean;
  }> {
    const results: OrderPackageValidationResult[] = [];
    const missingPackages: string[] = [];

    for (const pkg of packages) {
      const existing = await this.prisma.packageDirectory.findUnique({
        where: { packageCode: pkg.code },
      });

      if (existing) {
        results.push({
          code: pkg.code,
          name: pkg.name,
          quantity: pkg.quantity,
          exists: true,
          existingPackage: {
            packageId: existing.packageId,
            packageCode: existing.packageCode,
            packageName: existing.packageName,
          },
        });
      } else {
        results.push({
          code: pkg.code,
          name: pkg.name,
          quantity: pkg.quantity,
          exists: false,
        });
        missingPackages.push(pkg.code);
      }
    }

    return {
      packages: results,
      missingPackages,
      allExist: missingPackages.length === 0,
    };
  }
}
