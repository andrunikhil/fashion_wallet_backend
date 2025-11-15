import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common';
import { DesignService } from '../services/design.service';

@Controller('designs')
export class DesignController {
  constructor(private readonly designService: DesignService) {}

  @Get()
  findAll() {
    return this.designService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.designService.findOne(id);
  }

  @Post()
  create(@Body() createDesignDto: any) {
    return this.designService.create(createDesignDto);
  }

  @Put(':id')
  update(@Param('id') id: string, @Body() updateDesignDto: any) {
    return this.designService.update(id, updateDesignDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.designService.remove(id);
  }

  @Post(':id/fork')
  fork(@Param('id') id: string) {
    return this.designService.fork(id);
  }

  @Post(':id/export')
  export(@Param('id') id: string, @Body() exportOptions: any) {
    return this.designService.export(id, exportOptions);
  }
}
