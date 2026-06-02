import { Module } from '@nestjs/common';
import { CustomMachinesController } from './controllers/custom-machines.controller';
import { CustomMachineMasterController } from './controllers/custom-machine-master.controller';
import { CustomMachineTasksController } from './controllers/custom-machine-tasks.controller';
import { CustomMachinesService } from './services/custom-machines.service';
import { CustomMachineMasterService } from './services/custom-machine-master.service';
import { CustomMachineTasksService } from './services/custom-machine-tasks.service';
import { PrismaService } from 'src/shared/prisma.service';
import { SocketService } from 'src/modules/websocket/services/socket.service';

@Module({
  controllers: [CustomMachinesController, CustomMachineMasterController, CustomMachineTasksController],
  providers: [CustomMachinesService, CustomMachineMasterService, CustomMachineTasksService, PrismaService, SocketService],
  exports: [CustomMachinesService, CustomMachineMasterService, CustomMachineTasksService],
})
export class CustomMachinesModule {}
