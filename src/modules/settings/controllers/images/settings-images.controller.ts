import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Param,
  Body,
  UseInterceptors,
  UploadedFile,
  ParseIntPipe,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../../../auth/guards/jwt-auth.guard';
import { SettingsImagesService } from '../../services/images/settings-images.service';
import { UploadSettingsImageDto } from '../../dto/images/settings-image.dto';

@Controller('settings/images')
@UseGuards(JwtAuthGuard)
export class SettingsImagesController {
  constructor(private readonly settingsImagesService: SettingsImagesService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('image'))
  async uploadImage(
    @UploadedFile() file: any,
    @Body() dto: UploadSettingsImageDto,
  ) {
    return this.settingsImagesService.uploadImage(file, dto.description);
  }

  @Get('current')
  async getCurrentImage() {
    return this.settingsImagesService.getCurrentImage();
  }

  @Get(':id')
  async getImage(@Param('id', ParseIntPipe) id: number) {
    return this.settingsImagesService.getImage(id);
  }

  @Put(':id')
  @UseInterceptors(FileInterceptor('image'))
  async updateImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: any,
    @Body() dto: UploadSettingsImageDto,
  ) {
    return this.settingsImagesService.updateImage(id, file, dto.description);
  }

  @Delete(':id')
  async deleteImage(@Param('id', ParseIntPipe) id: number) {
    return this.settingsImagesService.deleteImage(id);
  }
}
