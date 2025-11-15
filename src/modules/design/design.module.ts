import { Module } from '@nestjs/common';
import { DesignController } from './controllers/design.controller';
import { DesignService } from './services/design.service';

@Module({
  controllers: [DesignController],
  providers: [DesignService],
  exports: [DesignService],
})
export class DesignModule {}
