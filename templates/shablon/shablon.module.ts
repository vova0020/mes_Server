// src/your/your.module.ts

import { Module } from '@nestjs/common';
import { YourController } from './controllers/shablon.controller';
import { YourService } from './services/shablon.service';

/**
 * Модуль объединяет контроллер и сервис в единый «пакет».
 * Чтобы Nest знал о них, нужно зарегистрировать в imports/app.module.ts.
 */
@Module({
  controllers: [YourController], // какие контроллеры «живут» в этом модуле
  providers: [YourService], // какие сервисы инжектятся внутри
})
export class YourModule {}
