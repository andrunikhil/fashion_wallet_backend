import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { AvatarService } from '../services/avatar.service';

@Controller('avatars')
export class AvatarController {
  constructor(private readonly avatarService: AvatarService) {}

  @Get()
  findAll() {
    return this.avatarService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.avatarService.findOne(id);
  }

  @Post()
  create(@Body() createAvatarDto: any) {
    return this.avatarService.create(createAvatarDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateAvatarDto: any) {
    return this.avatarService.update(id, updateAvatarDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.avatarService.remove(id);
  }

  @Post(':id/process')
  processPhotos(@Param('id') id: string) {
    return this.avatarService.processPhotos(id);
  }
}
