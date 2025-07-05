// src/parser/parser.module.ts
import { Module } from '@nestjs/common';
import { ParserController } from './controllers/parser.controller';
import { ParserService } from './services/parser.service';
import { ValidationService } from './services/validation.service';
import { SharedModule } from 'src/shared/shared.module';

@Module({
  imports: [SharedModule],
  controllers: [ParserController],
  providers: [ParserService, ValidationService],
  exports: [ParserService, ValidationService],
})
export class ParserModule {}