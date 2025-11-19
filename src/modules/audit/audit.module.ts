import { Module, Global } from '@nestjs/common';
import { AuditService } from './services/audit.service';
import { SharedModule } from 'src/shared/shared.module';

@Global()
@Module({
  imports: [SharedModule],
  providers: [AuditService],
  exports: [AuditService],
})
export class AuditModule {}
