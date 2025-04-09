import { Module } from '@nestjs/common';
import { DetailsController } from './controllers/details.controller';
import { DetailsService } from './services/details.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [DetailsController],
  providers: [DetailsService],
  exports: [DetailsService],
})
export class DetailsModule {}
