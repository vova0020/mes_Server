import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../shared/prisma.service';

export interface PackageValidationResult {
  code: string;
  name: string;
  exists: boolean;
  existingPackage?: {
    packageId: number;
    packageCode: string;
    packageName: string;
  };
}

@Injectable()
export class PackageValidationService {
  constructor(private readonly prismaService: PrismaService) {}

  async validatePackages(packages: Array<{ code: string; name: string }>): Promise<PackageValidationResult[]> {
    const results: PackageValidationResult[] = [];

    for (const pkg of packages) {
      const existing = await this.prismaService.packageDirectory.findUnique({
        where: { packageCode: pkg.code },
      });

      if (existing) {
        results.push({
          code: pkg.code,
          name: pkg.name,
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
          exists: false,
        });
      }
    }

    return results;
  }
}
