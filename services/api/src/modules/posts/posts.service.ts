import { Injectable, NotFoundException } from '@nestjs/common';
import { PostStatus, Visibility } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PostsService {
  constructor(private readonly prisma: PrismaService) {}

  async getPost(postId: string) {
    const post = await this.prisma.post.findFirst({
      where: {
        id: postId,
        status: PostStatus.ACTIVE,
        visibility: {
          in: [Visibility.PUBLIC, Visibility.UNLISTED],
        },
      },
      include: {
        author: true,
        coverMedia: true,
        trip: {
          include: {
            points: {
              orderBy: [{ sequence: 'asc' }],
              include: {
                place: true,
                mediaAssets: {
                  orderBy: [{ takenAt: 'asc' }, { createdAt: 'asc' }],
                },
              },
            },
          },
        },
        likes: true,
        saves: true,
        comments: {
          orderBy: { createdAt: 'asc' },
          include: {
            user: true,
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException('Post not found');
    }

    return {
      ...post,
      counts: {
        likes: post.likes.length,
        saves: post.saves.length,
        comments: post.comments.length,
      },
    };
  }
}

