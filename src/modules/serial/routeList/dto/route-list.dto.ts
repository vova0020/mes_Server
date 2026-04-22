import { ApiProperty } from '@nestjs/swagger';

export class RouteStageDto {
  @ApiProperty({ description: 'Название этапа' })
  stageName: string;

  @ApiProperty({ description: 'Дата завершения этапа', nullable: true })
  completedAt: Date | null;

  @ApiProperty({ description: 'Количество' })
  quantity: number;

  @ApiProperty({ description: 'Статус поддона' })
  status: string;
}

export class PalletRouteDataDto {
  @ApiProperty({ description: 'Номер поддона' })
  palletNumber: string;

  @ApiProperty({ description: 'Название детали' })
  partName: string;

  @ApiProperty({ description: 'Артикул детали' })
  partSku: string;

  @ApiProperty({ description: 'Дата создания детали' })
  partCreatedAt: Date;

  @ApiProperty({ description: 'Дата создания поддона' })
  palletCreatedAt: Date;

  @ApiProperty({ description: 'Количество на поддоне' })
  quantity: number;

  @ApiProperty({ description: 'Материал детали' })
  materialName: string;

  @ApiProperty({ description: 'Размер детали' })
  partSize: string;

  @ApiProperty({ description: 'Общее количество детали в заказе' })
  totalOrderQuantity: number;

  @ApiProperty({ description: 'Наименование облицовки кромки L1', nullable: true })
  edgingNameL1: string | null;

  @ApiProperty({ description: 'Артикул облицовки кромки L1', nullable: true })
  edgingSkuL1: string | null;

  @ApiProperty({ description: 'Наименование облицовки кромки W1', nullable: true })
  edgingNameW1: string | null;

  @ApiProperty({ description: 'Артикул облицовки кромки W1', nullable: true })
  edgingSkuW1: string | null;

  @ApiProperty({ description: 'Готовая длина детали', nullable: true })
  finishedLength: number | null;

  @ApiProperty({ description: 'Готовая ширина детали', nullable: true })
  finishedWidth: number | null;

  @ApiProperty({ description: 'Паз', nullable: true })
  groove: string | null;

  @ApiProperty({ description: 'Адрес буферной ячейки', nullable: true })
  bufferCellAddress: string | null;

  @ApiProperty({ description: 'Название заказа' })
  orderName: string;

  @ApiProperty({ description: 'Номер заказа' })
  orderNumber: string;

  @ApiProperty({ description: 'Этапы маршрута', type: [RouteStageDto] })
  routeStages: RouteStageDto[];
}