import { Controller, Get } from '@nestjs/common';

@Controller()
export class AppController {
  @Get()
  getHello() {
    return {
      name: 'PrintSlot API',
      status: 'running',
      version: '1.0.0'
    };
  }
}
