import { Module } from '@nestjs/common';
import { WorkMonitorController } from './controllers/work-monitor.controller';
import { WorkMonitorService } from './services/work-monitor.service';
import { PrismaService } from '../../shared/prisma.service';

@Module({
  controllers: [WorkMonitorController],
  providers: [WorkMonitorService, PrismaService],
})
export class WorkMonitorModule {}