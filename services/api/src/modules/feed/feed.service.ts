import { Injectable, Logger } from '@nestjs/common';
import { PostStatus, Visibility } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { GetFeedQueryDto } from './dto/get-feed-query.dto';

@Injectable()
export class FeedService {
  private readonly logger = new Logger(FeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async getFeed(userId: string, query: GetFeedQueryDto) {
    await this.usersService.ensureExists(userId);

    const items = await this.prisma.post.findMany({
      where: {
        status: PostStatus.ACTIVE,
        visibility: Visibility.PUBLIC,
        cityName: query.cityName ?? undefined,
        trip: query.kind
          ? {
              is: {
                kind: query.kind,
              },
            }
          : undefined,
      },
      include: {
        author: true,
        coverMedia: true,
        trip: {
          select: {
            id: true,
            title: true,
            kind: true,
            startedAt: true,
            endedAt: true,
            routePreview: true,
          },
        },
        _count: {
          select: {
            likes: true,
            saves: true,
            comments: true,
          },
        },
      },
      orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }],
      take: query.limit,
      skip: query.cursor ? 1 : 0,
      cursor: query.cursor ? { id: query.cursor } : undefined,
    });

    if (items.length) {
      try {
        await this.prisma.feedImpression.createMany({
          data: items.map((item, index) => ({
            userId,
            postId: item.id,
            source: 'home_feed',
            position: index,
          })),
          skipDuplicates: true,
        });
      } catch (error) {
        this.logger.warn(
          `Skipping feed impression write for user ${userId}: ${
            error instanceof Error ? error.message : 'unknown error'
          }`,
        );
      }
    }

    return {
      items,
      nextCursor: items.length === query.limit ? items[items.length - 1].id : null,
    };
  }
}
