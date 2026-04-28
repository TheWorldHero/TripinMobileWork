import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';

@ApiTags('health')
@Controller('v1/health')
export class HealthController {
  @Get()
  getHealth() {
    return {
      ok: true,
      service: 'tripin-api',
      timestamp: new Date().toISOString(),
    };
  }
}

