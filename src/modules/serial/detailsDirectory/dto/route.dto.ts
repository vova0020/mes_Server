import { IsString, IsNumber } from 'class-validator';

export class RouteDto {
  @IsNumber()
  routeId: number;

  @IsString()
  routeName: string;
}