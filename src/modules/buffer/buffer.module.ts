import { Module } from '@nestjs/common';
import { BuffersController } from './controllers/buffer.controller';
import { BuffersService } from './services/buffer.service';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [BuffersController],
  providers: [BuffersService],
  exports: [BuffersService],
})
export class BuffersModule {}
