import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CreateCommentDto } from './dto/create-comment.dto';
import { InteractionsService } from './interactions.service';

@ApiTags('interactions')
@ApiHeader({
  name: 'x-user-id',
  required: false,
  description: 'Temporary dev auth header. Falls back to DEMO_USER_ID.',
})
@Controller('v1/posts/:postId')
export class InteractionsController {
  constructor(private readonly interactionsService: InteractionsService) {}

  @Post('like')
  like(@CurrentUserId() userId: string, @Param('postId') postId: string) {
    return this.interactionsService.likePost(userId, postId);
  }

  @Delete('like')
  unlike(@CurrentUserId() userId: string, @Param('postId') postId: string) {
    return this.interactionsService.unlikePost(userId, postId);
  }

  @Post('save')
  save(@CurrentUserId() userId: string, @Param('postId') postId: string) {
    return this.interactionsService.savePost(userId, postId);
  }

  @Delete('save')
  unsave(@CurrentUserId() userId: string, @Param('postId') postId: string) {
    return this.interactionsService.unsavePost(userId, postId);
  }

  @Post('comments')
  createComment(
    @CurrentUserId() userId: string,
    @Param('postId') postId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.interactionsService.createComment(userId, postId, dto);
  }

  @Get('comments')
  listComments(@Param('postId') postId: string) {
    return this.interactionsService.listComments(postId);
  }
}

