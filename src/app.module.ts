import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infrastructure/database';
import { AuthModule } from './modules/auth/auth.module';
import { AvatarModule } from './modules/avatar/avatar.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { DesignModule } from './modules/design/design.module';
import databaseConfig from './config/database.config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      load: [databaseConfig],
    }),
    // Rate limiting: 100 requests per minute per IP
    ThrottlerModule.forRoot([{
      ttl: 60000, // 60 seconds
      limit: 100, // 100 requests
    }]),
    DatabaseModule,
    AuthModule,
    AvatarModule,
    CatalogModule,
    DesignModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
