import { Module } from '@nestjs/common';
import {
  CustomPalletsController,
  CustomPalletsManagementController,
} from './controllers/custom-pallets.controller';
import { CustomPalletsService } from './services/custom-pallets.service';
import { SharedModule } from '../../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [CustomPalletsController, CustomPalletsManagementController],
  providers: [CustomPalletsService],
  exports: [CustomPalletsService],
})
export class CustomPalletsModule {}
