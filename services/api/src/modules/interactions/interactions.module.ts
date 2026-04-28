import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { InteractionsController } from './interactions.controller';
import { InteractionsService } from './interactions.service';

@Module({
  imports: [UsersModule],
  controllers: [InteractionsController],
  providers: [InteractionsService],
})
export class InteractionsModule {}

