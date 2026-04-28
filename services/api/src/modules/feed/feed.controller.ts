import { Controller, Get, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { GetFeedQueryDto } from './dto/get-feed-query.dto';
import { FeedService } from './feed.service';

@ApiTags('feed')
@ApiHeader({
  name: 'x-user-id',
  required: false,
  description: 'Temporary dev auth header. Falls back to DEMO_USER_ID.',
})
@Controller('v1/feed')
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  getFeed(@CurrentUserId() userId: string, @Query() query: GetFeedQueryDto) {
    return this.feedService.getFeed(userId, query);
  }
}

