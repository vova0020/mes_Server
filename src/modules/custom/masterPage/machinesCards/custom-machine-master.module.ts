import { Module } from '@nestjs/common';
import { CustomMachineMasterController } from './controllers/custom-machine-master.controller';
import { CustomMachineMasterService } from './services/custom-machine-master.service';
import { PrismaService } from '../../../../shared/prisma.service';

@Module({
  controllers: [CustomMachineMasterController],
  providers: [CustomMachineMasterService, PrismaService],
  exports: [CustomMachineMasterService],
})
export class CustomMachineMasterModule {}
