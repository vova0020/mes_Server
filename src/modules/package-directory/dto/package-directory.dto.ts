import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';

export class PackageDetailDto {
  @IsInt({ message: 'ID детали должно быть числом' })
  @Min(1, { message: 'ID детали должно быть больше 0' })
  detailId: number;

  @IsInt({ message: 'Количество должно быть числом' })
  @Min(1, { message: 'Количество должно быть больше 0' })
  quantity: number;
}

export class CreatePackageDirectoryDto {
  @IsString({ message: 'Код упаковки должен быть строкой' })
  @IsNotEmpty({ message: 'Код упаковки не может быть пустым' })
  packageCode: string;

  @IsString({ message: 'Название упаковки должно быть строкой' })
  @IsNotEmpty({ message: 'Название упаковки не может быть пустым' })
  packageName: string;
}

export class UpdatePackageDirectoryDto {
  @IsOptional()
  @IsString({ message: 'Код упаковки должен быть строкой' })
  @IsNotEmpty({ message: 'Код упаковки не может быть пустым' })
  packageCode?: string;

  @IsOptional()
  @IsString({ message: 'Название упаковки должно быть строкой' })
  @IsNotEmpty({ message: 'Название упаковки не может быть пустым' })
  packageName?: string;
}
