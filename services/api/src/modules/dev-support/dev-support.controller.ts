import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { DevSupportService } from './dev-support.service';

@ApiTags('dev')
@Controller('v1/dev')
export class DevSupportController {
  constructor(private readonly devSupportService: DevSupportService) {}

  @Get('status')
  getStatus() {
    return this.devSupportService.getStatus();
  }

  @Post('seed')
  seed(@Body() body?: { reset?: boolean }) {
    return this.devSupportService.seedDemo(Boolean(body?.reset ?? true));
  }
}

