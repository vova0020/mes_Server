import { Module } from '@nestjs/common';
import { DetailsMasterController } from './controllers/detailsMaster.controller';
import { DetailsMasterService } from './services/detailsMaster.service';
import { SharedModule } from '../../shared/shared.module';
import { DetailsMachinsController } from './controllers/dateilsMachins.controller';
import { DetailsMachinNoSmenService } from './services/detailsMachinNoSmen.service';

@Module({
  imports: [SharedModule],
  controllers: [DetailsMasterController, DetailsMachinsController],
  providers: [DetailsMasterService, DetailsMachinNoSmenService],
  exports: [DetailsMasterService, DetailsMachinNoSmenService],
})
export class DetailsModule {}
