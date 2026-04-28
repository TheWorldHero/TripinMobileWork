import { Module } from '@nestjs/common';
import { DevSupportController } from './dev-support.controller';
import { DevSupportService } from './dev-support.service';

@Module({
  controllers: [DevSupportController],
  providers: [DevSupportService],
})
export class DevSupportModule {}

