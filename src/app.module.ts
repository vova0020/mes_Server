import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrdersModule } from './modules/orders/orders.module';
import { DetailsModule } from './modules/detailsProduct/details.module';
import { PalletsModule } from './modules/palletsProduct/pallets.module';
import { BuffersModule } from './modules/buffer/buffer.module';
import { MachinsMasterModule } from './modules/machinsMaster/machin.module';
import { MachinNoSmenModule } from './modules/machinsNoSmen/machin.module';
import { MachinModule } from './modules/machinsSmen/machin.module';
import { YpakModule } from './modules/ypakBlok/ypak.module';
import { WebsocketModule } from './modules/websocket/websocket.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SharedModule,
    AuthModule,
    UsersModule,
    OrdersModule,
    DetailsModule,
    PalletsModule,
    BuffersModule,
    MachinsMasterModule,
    MachinNoSmenModule,
    MachinModule,
    YpakModule,
    WebsocketModule,
  ],
})
export class AppModule {}
