import { Module } from '@nestjs/common';
import { CustomDetailsController } from './controllers/custom-details.controller';
import { CustomDetailsService } from './services/custom-details.service';
import { SharedModule } from '../../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [CustomDetailsController],
  providers: [CustomDetailsService],
  exports: [CustomDetailsService],
})
export class CustomDetailsModule {}
