// src/your/your.module.ts

import { Module } from '@nestjs/common';
import { NavbarController } from './controllers/navbar.controller';
import { NavbarService } from './services/navbar.service';
import { SharedModule } from '../../shared/shared.module';
import { WebsocketModule } from '../websocket/websocket.module';
/**
 * Модуль объединяет контроллер и сервис в единый «пакет».
 * Чтобы Nest знал о них, нужно зарегистрировать в imports/app.module.ts.
 */
@Module({
  imports: [SharedModule, WebsocketModule],
  controllers: [NavbarController], // какие контроллеры «живут» в этом модуле
  providers: [NavbarService], // какие сервисы инжектятся внутри
})
export class NavbarModule {}
