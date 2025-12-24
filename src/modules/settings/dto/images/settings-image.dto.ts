import { IsString, IsOptional } from 'class-validator';

export class UploadSettingsImageDto {
  @IsString()
  @IsOptional()
  description?: string;
}

export class SettingsImageResponseDto {
  imageId: number;
  imagePath: string;
  imageUrl: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}
