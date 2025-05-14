import { Module } from '@nestjs/common';
import { OrdersController } from './controllers/orders.controller';
import { OrdersService } from './services/orders.service';
import { SharedModule } from '../../shared/shared.module';
import { PackagingMasterController } from './controllers/packaging-master.controller';
import { PackagingMasterService } from './services/packaging-master.service';
import { TaskDetailController } from './controllers/taskDetail.controller';
import { TaskDetailService } from './services/taskDetail.service';

@Module({
  imports: [SharedModule],
  controllers: [
    OrdersController,
    PackagingMasterController,
    TaskDetailController,
  ],
  providers: [OrdersService, PackagingMasterService, TaskDetailService],
})
export class YpakModule {}
