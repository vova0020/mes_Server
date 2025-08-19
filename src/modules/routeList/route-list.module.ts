import { Module } from '@nestjs/common';
import { RouteListController } from './controllers/route-list.controller';
import { RouteListService } from './services/route-list.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [RouteListController],
  providers: [RouteListService],
  exports: [RouteListService],
})
export class RouteListModule {}