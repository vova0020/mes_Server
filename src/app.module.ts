import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
// import { UsersModule } from './modules/users/users.module';
// import { OrdersModule } from './modules/ordersProduct/orders.module';
// import { DetailsModule } from './modules/detailsProduct/details.module';
// import { PalletsModule } from './modules/palletsProduct/pallets.module';
// import { BuffersModule } from './modules/buffer/buffer.module';
// import { MachinNoSmenModule } from './modules/machinsNoSmen!/machin.module';
// import { MachinModule } from './modules/machinsSmen!/machin.module';
// import { YpakModule } from './modules/ypakBlok/ypak.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { SettingsModule } from './modules/settings/settings.module';
// import { MachinsModule } from './modules/machins/machin.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SharedModule,
    AuthModule,
    SettingsModule,
    // UsersModule,
    // OrdersModule,
    // DetailsModule,
    // PalletsModule,
    // BuffersModule,
    // MachinsModule,
    // MachinNoSmenModule,
    // MachinModule,
    // YpakModule,
    WebsocketModule,
  ],
})
export class AppModule {}
