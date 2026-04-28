import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DevService } from './dev.service';

@ApiTags('dev')
@Controller('v1/dev')
export class DevController {
  constructor(private readonly devService: DevService) {}

  @Get('status')
  getStatus() {
    return this.devService.getStatus();
  }

  @Post('seed')
  seed(@Body() body?: { reset?: boolean }) {
    return this.devService.seedDemo(Boolean(body?.reset ?? true));
  }
}

