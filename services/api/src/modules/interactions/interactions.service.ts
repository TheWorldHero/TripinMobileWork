import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateCommentDto } from './dto/create-comment.dto';

@Injectable()
export class InteractionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async likePost(userId: string, postId: string) {
    await this.ensurePostAndUser(userId, postId);

    await this.prisma.postLike.upsert({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
      create: {
        postId,
        userId,
      },
      update: {},
    });

    await this.logEvent(userId, postId, 'post_liked');
    return this.getPostInteractionState(postId, userId);
  }

  async unlikePost(userId: string, postId: string) {
    await this.ensurePostAndUser(userId, postId);

    await this.prisma.postLike.deleteMany({
      where: {
        postId,
        userId,
      },
    });

    return this.getPostInteractionState(postId, userId);
  }

  async savePost(userId: string, postId: string) {
    await this.ensurePostAndUser(userId, postId);

    await this.prisma.postSave.upsert({
      where: {
        postId_userId: {
          postId,
          userId,
        },
      },
      create: {
        postId,
        userId,
      },
      update: {},
    });

    await this.logEvent(userId, postId, 'post_saved');
    return this.getPostInteractionState(postId, userId);
  }

  async unsavePost(userId: string, postId: string) {
    await this.ensurePostAndUser(userId, postId);

    await this.prisma.postSave.deleteMany({
      where: {
        postId,
        userId,
      },
    });

    return this.getPostInteractionState(postId, userId);
  }

  async createComment(userId: string, postId: string, dto: CreateCommentDto) {
    await this.ensurePostAndUser(userId, postId);

    const comment = await this.prisma.comment.create({
      data: {
        postId,
        userId,
        content: dto.content,
      },
      include: {
        user: true,
      },
    });

    await this.logEvent(userId, postId, 'post_commented', { contentLength: dto.content.length });
    return comment;
  }

  listComments(postId: string) {
    return this.prisma.comment.findMany({
      where: { postId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }

  private async ensurePostAndUser(userId: string, postId: string) {
    await this.usersService.ensureExists(userId);

    const post = await this.prisma.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return post;
  }

  private async getPostInteractionState(postId: string, userId: string) {
    const [likes, saves, comments, liked, saved] = await Promise.all([
      this.prisma.postLike.count({ where: { postId } }),
      this.prisma.postSave.count({ where: { postId } }),
      this.prisma.comment.count({ where: { postId } }),
      this.prisma.postLike.findUnique({
        where: { postId_userId: { postId, userId } },
      }),
      this.prisma.postSave.findUnique({
        where: { postId_userId: { postId, userId } },
      }),
    ]);

    return {
      postId,
      counts: {
        likes,
        saves,
        comments,
      },
      viewerState: {
        liked: Boolean(liked),
        saved: Boolean(saved),
      },
    };
  }

  private async logEvent(
    userId: string,
    postId: string,
    eventType: string,
    payload?: Prisma.InputJsonValue,
  ) {
    await this.prisma.userActionEvent.create({
      data: {
        userId,
        postId,
        eventType,
        payload,
      },
    });
  }
}
