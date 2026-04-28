import { Injectable } from '@nestjs/common';
import { MediaStatus, PlaceProvider, PointSource, PostStatus, Prisma, TripKind, TripStatus, Visibility } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class DevService {
  constructor(private readonly prisma: PrismaService) {}

  async getStatus() {
    const [users, trips, posts] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.trip.count(),
      this.prisma.post.count(),
    ]);

    return {
      ok: true,
      users,
      trips,
      posts,
    };
  }

  async seedDemo(reset = true) {
    if (reset) {
      await this.prisma.$transaction([
        this.prisma.comment.deleteMany(),
        this.prisma.postLike.deleteMany(),
        this.prisma.postSave.deleteMany(),
        this.prisma.feedImpression.deleteMany(),
        this.prisma.userActionEvent.deleteMany(),
        this.prisma.post.deleteMany(),
        this.prisma.mediaAsset.deleteMany(),
        this.prisma.tripPoint.deleteMany(),
        this.prisma.trip.deleteMany(),
        this.prisma.place.deleteMany(),
        this.prisma.user.deleteMany(),
      ]);
    }

    const demoUser = await this.prisma.user.upsert({
      where: { id: 'demo-user' },
      create: {
        id: 'demo-user',
        username: 'demo',
        displayName: 'Demo User',
        bio: 'Local MVP tester',
      },
      update: {
        displayName: 'Demo User',
        bio: 'Local MVP tester',
      },
    });

    const creator = await this.prisma.user.upsert({
      where: { id: 'creator-li' },
      create: {
        id: 'creator-li',
        username: 'liwen',
        displayName: 'Li Wen',
        bio: 'Map-first life timeline creator',
      },
      update: {
        displayName: 'Li Wen',
        bio: 'Map-first life timeline creator',
      },
    });

    const placeIds = {
      temple: 'place-beijing-temple-heaven',
      qianmen: 'place-beijing-qianmen',
      shichahai: 'place-beijing-shichahai',
      798: 'place-beijing-798',
    };

    await Promise.all([
      this.prisma.place.upsert({
        where: {
          provider_providerId: {
            provider: PlaceProvider.AMAP,
            providerId: placeIds.temple,
          },
        },
        create: {
          id: placeIds.temple,
          provider: PlaceProvider.AMAP,
          providerId: placeIds.temple,
          name: '天坛公园',
          formattedAddress: '北京市东城区天坛东里甲1号',
          cityName: '北京',
          provinceName: '北京市',
          districtName: '东城区',
          latitude: 39.882245,
          longitude: 116.406605,
        },
        update: {},
      }),
      this.prisma.place.upsert({
        where: {
          provider_providerId: {
            provider: PlaceProvider.AMAP,
            providerId: placeIds.qianmen,
          },
        },
        create: {
          id: placeIds.qianmen,
          provider: PlaceProvider.AMAP,
          providerId: placeIds.qianmen,
          name: '前门大街',
          formattedAddress: '北京市东城区前门大街',
          cityName: '北京',
          provinceName: '北京市',
          districtName: '东城区',
          latitude: 39.899051,
          longitude: 116.397942,
        },
        update: {},
      }),
      this.prisma.place.upsert({
        where: {
          provider_providerId: {
            provider: PlaceProvider.AMAP,
            providerId: placeIds.shichahai,
          },
        },
        create: {
          id: placeIds.shichahai,
          provider: PlaceProvider.AMAP,
          providerId: placeIds.shichahai,
          name: '什刹海',
          formattedAddress: '北京市西城区地安门西大街49号',
          cityName: '北京',
          provinceName: '北京市',
          districtName: '西城区',
          latitude: 39.948698,
          longitude: 116.379151,
        },
        update: {},
      }),
      this.prisma.place.upsert({
        where: {
          provider_providerId: {
            provider: PlaceProvider.AMAP,
            providerId: placeIds['798'],
          },
        },
        create: {
          id: placeIds['798'],
          provider: PlaceProvider.AMAP,
          providerId: placeIds['798'],
          name: '798艺术区',
          formattedAddress: '北京市朝阳区酒仙桥路4号',
          cityName: '北京',
          provinceName: '北京市',
          districtName: '朝阳区',
          latitude: 39.984123,
          longitude: 116.497512,
        },
        update: {},
      }),
    ]);

    const tripId = 'trip-beijing-spring-weekend';
    await this.prisma.trip.upsert({
      where: { id: tripId },
      create: {
        id: tripId,
        ownerId: creator.id,
        title: '北京春日周末轨迹',
        summary: '从天坛晨跑到什刹海夜色，一条适合周末慢慢走的北京轨迹。',
        kind: TripKind.MIXED,
        status: TripStatus.DRAFT,
        visibility: Visibility.PUBLIC,
        cityName: '北京',
        provinceName: '北京市',
        countryCode: 'CN',
      },
      update: {
        title: '北京春日周末轨迹',
        summary: '从天坛晨跑到什刹海夜色，一条适合周末慢慢走的北京轨迹。',
        cityName: '北京',
      },
    });

    const mediaItems = [
      {
        id: 'media-temple-1',
        title: '晨光和坛墙',
        caption: '七点多的天坛光线很柔，适合开始这一天。',
        takenAt: new Date('2026-04-05T07:18:00+08:00'),
        lat: 39.882245,
        lng: 116.406605,
      },
      {
        id: 'media-qianmen-1',
        title: '午后的老街',
        caption: '街口的砖墙和路牌有种熟悉的北京感。',
        takenAt: new Date('2026-04-05T13:10:00+08:00'),
        lat: 39.899051,
        lng: 116.397942,
      },
      {
        id: 'media-shichahai-1',
        title: '傍晚湖边',
        caption: '天黑前的湖边最适合慢慢散步。',
        takenAt: new Date('2026-04-05T18:35:00+08:00'),
        lat: 39.948698,
        lng: 116.379151,
      },
      {
        id: 'media-798-1',
        title: '下午转去798',
        caption: '展厅和街区都很好拍，适合留半天。',
        takenAt: new Date('2026-04-06T15:20:00+08:00'),
        lat: 39.984123,
        lng: 116.497512,
      },
    ];

    for (const item of mediaItems) {
      await this.prisma.mediaAsset.upsert({
        where: { id: item.id },
        create: {
          id: item.id,
          ownerId: creator.id,
          tripId,
          storageKey: `demo/${item.id}.jpg`,
          bucket: 'tripin-media',
          originalName: `${item.id}.jpg`,
          mimeType: 'image/jpeg',
          bytes: 2_400_000,
          width: 1440,
          height: 1080,
          caption: item.caption,
          takenAt: item.takenAt,
          exifLatitude: item.lat,
          exifLongitude: item.lng,
          status: MediaStatus.READY,
        },
        update: {
          tripId,
          caption: item.caption,
          takenAt: item.takenAt,
          exifLatitude: item.lat,
          exifLongitude: item.lng,
          status: MediaStatus.READY,
        },
      });
    }

    const pointDefinitions = [
      {
        id: 'point-temple',
        placeId: placeIds.temple,
        title: '天坛清晨',
        note: '先去天坛附近慢跑，再拍一组很安静的晨光。',
        startedAt: new Date('2026-04-05T07:00:00+08:00'),
        endedAt: new Date('2026-04-05T08:30:00+08:00'),
        lat: 39.882245,
        lng: 116.406605,
        sequence: 1,
        mediaIds: ['media-temple-1'],
      },
      {
        id: 'point-qianmen',
        placeId: placeIds.qianmen,
        title: '前门散步',
        note: '中午去前门吃饭，顺路逛老街和胡同边缘。',
        startedAt: new Date('2026-04-05T12:40:00+08:00'),
        endedAt: new Date('2026-04-05T14:20:00+08:00'),
        lat: 39.899051,
        lng: 116.397942,
        sequence: 2,
        mediaIds: ['media-qianmen-1'],
      },
      {
        id: 'point-shichahai',
        placeId: placeIds.shichahai,
        title: '什刹海傍晚',
        note: '晚上在湖边慢慢走，适合把这一天收住。',
        startedAt: new Date('2026-04-05T17:50:00+08:00'),
        endedAt: new Date('2026-04-05T19:20:00+08:00'),
        lat: 39.948698,
        lng: 116.379151,
        sequence: 3,
        mediaIds: ['media-shichahai-1'],
      },
      {
        id: 'point-798',
        placeId: placeIds['798'],
        title: '798慢逛',
        note: '第二天下午留给展览和街拍，节奏会更松一点。',
        startedAt: new Date('2026-04-06T14:20:00+08:00'),
        endedAt: new Date('2026-04-06T17:30:00+08:00'),
        lat: 39.984123,
        lng: 116.497512,
        sequence: 4,
        mediaIds: ['media-798-1'],
      },
    ];

    for (const point of pointDefinitions) {
      await this.prisma.tripPoint.upsert({
        where: { id: point.id },
        create: {
          id: point.id,
          tripId,
          placeId: point.placeId,
          title: point.title,
          note: point.note,
          startedAt: point.startedAt,
          endedAt: point.endedAt,
          latitude: point.lat,
          longitude: point.lng,
          sequence: point.sequence,
          sourceType: PointSource.MANUAL,
          mediaCount: point.mediaIds.length,
          addressSnapshot: {
            placeId: point.placeId,
            title: point.title,
          },
        },
        update: {
          placeId: point.placeId,
          title: point.title,
          note: point.note,
          startedAt: point.startedAt,
          endedAt: point.endedAt,
          latitude: point.lat,
          longitude: point.lng,
          sequence: point.sequence,
          sourceType: PointSource.MANUAL,
          mediaCount: point.mediaIds.length,
        },
      });

      await this.prisma.mediaAsset.updateMany({
        where: {
          id: { in: point.mediaIds },
        },
        data: {
          tripId,
          tripPointId: point.id,
        },
      });
    }

    const routePreview: Prisma.InputJsonValue = pointDefinitions.map((point) => ({
      pointId: point.id,
      sequence: point.sequence,
      latitude: point.lat,
      longitude: point.lng,
    }));

    await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        coverMediaId: 'media-temple-1',
        pointCount: pointDefinitions.length,
        mediaCount: mediaItems.length,
        routePreview,
        startedAt: pointDefinitions[0].startedAt,
        endedAt: pointDefinitions[pointDefinitions.length - 1].endedAt,
        status: TripStatus.PUBLISHED,
        visibility: Visibility.PUBLIC,
        publishedAt: new Date('2026-04-06T20:00:00+08:00'),
      },
    });

    await this.prisma.post.upsert({
      where: { tripId },
      create: {
        id: 'post-beijing-spring-weekend',
        tripId,
        authorId: creator.id,
        title: '北京春日周末轨迹',
        summary: '从天坛到前门，再到什刹海和798，适合发呆和散步的两天。',
        cityName: '北京',
        coverMediaId: 'media-temple-1',
        pointCount: pointDefinitions.length,
        mediaCount: mediaItems.length,
        status: PostStatus.ACTIVE,
        visibility: Visibility.PUBLIC,
        publishedAt: new Date('2026-04-06T20:00:00+08:00'),
      },
      update: {
        title: '北京春日周末轨迹',
        summary: '从天坛到前门，再到什刹海和798，适合发呆和散步的两天。',
        cityName: '北京',
        coverMediaId: 'media-temple-1',
        pointCount: pointDefinitions.length,
        mediaCount: mediaItems.length,
        status: PostStatus.ACTIVE,
        visibility: Visibility.PUBLIC,
        publishedAt: new Date('2026-04-06T20:00:00+08:00'),
      },
    });

    await this.prisma.postLike.upsert({
      where: {
        postId_userId: {
          postId: 'post-beijing-spring-weekend',
          userId: demoUser.id,
        },
      },
      create: {
        id: 'like-demo-1',
        postId: 'post-beijing-spring-weekend',
        userId: demoUser.id,
      },
      update: {},
    });

    await this.prisma.postSave.upsert({
      where: {
        postId_userId: {
          postId: 'post-beijing-spring-weekend',
          userId: demoUser.id,
        },
      },
      create: {
        id: 'save-demo-1',
        postId: 'post-beijing-spring-weekend',
        userId: demoUser.id,
      },
      update: {},
    });

    await this.prisma.comment.upsert({
      where: { id: 'comment-demo-1' },
      create: {
        id: 'comment-demo-1',
        postId: 'post-beijing-spring-weekend',
        userId: demoUser.id,
        content: '这个轨迹页很有代入感，能直接看到一天怎么走完。',
      },
      update: {
        content: '这个轨迹页很有代入感，能直接看到一天怎么走完。',
      },
    });

    return {
      ok: true,
      users: 2,
      posts: 1,
      tripId,
      postId: 'post-beijing-spring-weekend',
    };
  }
}
