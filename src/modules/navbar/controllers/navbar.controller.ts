import { Controller, Get, NotFoundException } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { NavbarService } from '../services/navbar.service';

@ApiTags('navbar')
@Controller('navbar')
export class NavbarController {
  constructor(private readonly navbarService: NavbarService) {}

  @Get('stage')
  @ApiOperation({ summary: 'Получить список всех этапов' })
  @ApiResponse({ status: 200, description: 'Список этапов успешно получен' })
  @ApiResponse({ status: 404, description: 'Этапы не найдены' })
  async getStages(): Promise<any> {
    const stages = await this.navbarService.getStage();

    if (!stages || stages.length === 0) {
      throw new NotFoundException(`Этапы не найдены`);
    }

    return {
      stages,
    };
  }
}
