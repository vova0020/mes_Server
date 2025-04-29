import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrdersModule } from './modules/orders/orders.module';
import { DetailsModule } from './modules/detailsProduct/details.module';
import { PalletsModule } from './modules/palletsProduct/pallets.module';
import { BuffersModule } from './modules/buffer/buffer.module';
import { MachinsModule } from './modules/machins/machin.module';

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
    MachinsModule,
  ],
})
export class AppModule {}
