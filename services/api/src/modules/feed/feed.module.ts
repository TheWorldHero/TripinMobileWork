import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { FeedController } from './feed.controller';
import { FeedService } from './feed.service';

@Module({
  imports: [UsersModule],
  controllers: [FeedController],
  providers: [FeedService],
})
export class FeedModule {}

