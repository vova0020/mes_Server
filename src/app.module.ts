import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SharedModule } from './shared/shared.module';
import { AuthModule } from './modules/auth/auth.module';
// import { UsersModule } from './modules/users/users.module';
import { OrdersModule } from './modules/ordersProduct/orders.module';
import { DetailsModule } from './modules/detailsProduct/details.module';
import { PalletsModule } from './modules/palletsProduct/pallets.module';
import { BuffersModule } from './modules/buffer/buffer.module';
// import { MachinNoSmenModule } from './modules/machinsNoSmen!/machin.module';
// import { MachinModule } from './modules/machinsSmen!/machin.module';
// import { YpakModule } from './modules/ypakBlok/ypak.module';
import { WebsocketModule } from './modules/websocket/websocket.module';
import { SettingsModule } from './modules/settings/settings.module';
import { MachinsModule } from './modules/machins/machin.module';
import { PackagingModule } from './modules/packaging/packaging.module';
import { PackagingProductModule } from './modules/packagingProduct/packagingProduct.module';
import { NavbarModule } from './modules/navbar/navbar.module';
import { PackageDirectoryModule } from './modules/package-directory';
import { DetailsDirectoryModule } from './modules/detailsDirectory/details-directory.module';
import { ProductionOrdersModule } from './modules/production-orders/production-orders.module';
import { RouteManagementModule } from './modules/route-management/route-management.module';
import { OrderManagementModule } from './modules/order-management/order-management.module';
import { RouteListModule } from './modules/routeList/route-list.module';
import { WorkMonitorModule } from './modules/work-monitor/work-monitor.module';
import { AuditModule } from './modules/audit/audit.module';
import { StatisticsModule } from './modules/statistics/statistics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    SharedModule,
    AuthModule,
    SettingsModule,
    PackagingProductModule,
    OrdersModule,
    DetailsModule,
    PalletsModule,
    BuffersModule,
    MachinsModule,
    PackagingModule,
    NavbarModule,
    PackageDirectoryModule,
    DetailsDirectoryModule,
    ProductionOrdersModule,
    RouteManagementModule,
    OrderManagementModule,
    RouteListModule,
    WorkMonitorModule,
    AuditModule,
    StatisticsModule,
    
    // MachinNoSmenModule,
    // MachinModule,
    // YpakModule,
    WebsocketModule,
  ],
})
export class AppModule {}