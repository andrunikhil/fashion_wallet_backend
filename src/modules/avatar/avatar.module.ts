import { Module } from '@nestjs/common';
import { AvatarController } from './controllers/avatar.controller';
import { AvatarService } from './services/avatar.service';

@Module({
  controllers: [AvatarController],
  providers: [AvatarService],
  exports: [AvatarService],
})
export class AvatarModule {}
