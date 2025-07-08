// src/parser/parser.module.ts
import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { ParserController } from './controllers/parser.controller';
import { DetailsController } from './controllers/details.controller';
import { ParserService } from './services/parser.service';
import { ValidationService } from './services/validation.service';
import { DetailsService } from './services/details.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [
    SharedModule,
    MulterModule.register({
      dest: './uploads',
    }),
  ],
  controllers: [ParserController, DetailsController],
  providers: [ParserService, ValidationService, DetailsService],
  exports: [ParserService, ValidationService, DetailsService],
})
export class DetailsDirectoryModule {}