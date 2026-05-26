import { Module } from '@nestjs/common';
import { CustomOrdersController } from './controllers/custom-orders.controller';
import { CustomOrdersService } from './services/custom-orders.service';
import { SharedModule } from '../../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [CustomOrdersController],
  providers: [CustomOrdersService],
  exports: [CustomOrdersService],
})
export class CustomOrdersModule {}
