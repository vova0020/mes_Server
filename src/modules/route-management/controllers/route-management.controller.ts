import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  ParseIntPipe,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';
import { RouteManagementService } from '../services/route-management.service';
import {
  OrderForRoutesResponseDto,
  OrderPartsForRoutesResponseDto,
  PartRouteUpdateResponseDto,
  UpdatePartRouteDto,
} from '../dto/route-management.dto';

@ApiTags('Управление маршрутами')
@Controller('route-management')
export class RouteManagementController {
  constructor(
    private readonly routeManagementService: RouteManagementService,
  ) {}

  @Get('orders')
  @ApiOperation({
    summary: 'Получить заказы для управления маршрутами',
    description:
      'Возвращает список заказов со статусами "Предварительный" или "Утверждено"',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Список заказов для управления маршрутами',
    type: [OrderForRoutesResponseDto],
  })
  async getOrdersForRouteManagement(): Promise<OrderForRoutesResponseDto[]> {
    return this.routeManagementService.getOrdersForRouteManagement();
  }

  @Get('orders/:orderId/parts')
  @ApiOperation({
    summary: 'Получить детали заказа для управления маршрутами',
    description:
      'Возвращает все детали указанного заказа с информацией о текущих маршрутах и доступных для назначения маршрутах',
  })
  @ApiParam({
    name: 'orderId',
    description: 'ID заказа',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Детали заказа с информацией о маршрутах',
    type: OrderPartsForRoutesResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Заказ не найден',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Заказ имеет неподходящий статус для управления маршрутами',
  })
  async getOrderPartsForRouteManagement(
    @Param('orderId', ParseIntPipe) orderId: number,
  ): Promise<OrderPartsForRoutesResponseDto> {
    return this.routeManagementService.getOrderPartsForRouteManagement(orderId);
  }

  @Patch('parts/:partId/route')
  @ApiOperation({
    summary: 'Изменить маршрут детали',
    description:
      'Обновляет маршрут указанной детали. Деталь должна принадлежать заказу со статусом "Предварительный" или "Утверждено"',
  })
  @ApiParam({
    name: 'partId',
    description: 'ID детали',
    example: 1,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Маршрут детали успешно обновлен',
    type: PartRouteUpdateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Деталь или маршрут не найдены',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description:
      'Нельзя изменить маршрут детали (неподходящий статус заказа или маршрут не изменился)',
  })
  async updatePartRoute(
    @Param('partId', ParseIntPipe) partId: number,
    @Body() updateDto: UpdatePartRouteDto,
  ): Promise<PartRouteUpdateResponseDto> {
    return this.routeManagementService.updatePartRoute(partId, updateDto);
  }
}
