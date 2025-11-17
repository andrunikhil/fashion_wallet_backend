import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './infrastructure/database';
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
    DatabaseModule,
    AvatarModule,
    CatalogModule,
    DesignModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
