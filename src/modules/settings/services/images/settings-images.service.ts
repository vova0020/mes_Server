import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../../shared/prisma.service';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SettingsImagesService {
  private readonly uploadPath = path.join(process.cwd(), 'src', 'modules', 'settings', 'uploads');

  constructor(private prisma: PrismaService) {
    if (!fs.existsSync(this.uploadPath)) {
      fs.mkdirSync(this.uploadPath, { recursive: true });
    }
  }

  async uploadImage(file: any, description?: string) {
    const ext = file.originalname.split('.').pop();
    const filename = `${Date.now()}.${ext}`;
    const filepath = path.join(this.uploadPath, filename);
    
    fs.writeFileSync(filepath, file.buffer);

    const image = await this.prisma.settingsImage.create({
      data: {
        imagePath: filepath,
        imageUrl: `/settings/uploads/${filename}`,
        description,
      },
    });

    return image;
  }

  async getImage(imageId: number) {
    const image = await this.prisma.settingsImage.findUnique({
      where: { imageId },
    });

    if (!image) {
      throw new NotFoundException('Изображение не найдено');
    }

    return image;
  }

  async getCurrentImage() {
    const image = await this.prisma.settingsImage.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    return image;
  }

  async updateImage(imageId: number, file: any, description?: string) {
    const existingImage = await this.getImage(imageId);

    if (fs.existsSync(existingImage.imagePath)) {
      fs.unlinkSync(existingImage.imagePath);
    }

    const ext = file.originalname.split('.').pop();
    const filename = `${Date.now()}.${ext}`;
    const filepath = path.join(this.uploadPath, filename);
    
    fs.writeFileSync(filepath, file.buffer);

    const updatedImage = await this.prisma.settingsImage.update({
      where: { imageId },
      data: {
        imagePath: filepath,
        imageUrl: `/settings/uploads/${filename}`,
        description,
      },
    });

    return updatedImage;
  }

  async deleteImage(imageId: number) {
    const image = await this.getImage(imageId);

    if (fs.existsSync(image.imagePath)) {
      fs.unlinkSync(image.imagePath);
    }

    await this.prisma.settingsImage.delete({
      where: { imageId },
    });

    return { message: 'Изображение удалено' };
  }
}
