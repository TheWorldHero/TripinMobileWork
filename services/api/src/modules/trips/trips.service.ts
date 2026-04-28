import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PointSource, Prisma, TripStatus, Visibility } from '@prisma/client';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { haversineInKm } from '../../common/utils/geo';
import { UsersService } from '../users/users.service';
import { AutoAssembleTripDto } from './dto/auto-assemble-trip.dto';
import { CreateTripPointDto } from './dto/create-trip-point.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { PublishTripDto } from './dto/publish-trip.dto';
import { ReorderTripPointsDto } from './dto/reorder-trip-points.dto';
import { UpdateTripPointDto } from './dto/update-trip-point.dto';
import { UpdateTripDto } from './dto/update-trip.dto';

@Injectable()
export class TripsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async createTrip(userId: string, dto: CreateTripDto) {
    await this.usersService.ensureExists(userId);

    const trip = await this.prisma.trip.create({
      data: {
        ownerId: userId,
        title: dto.title,
        summary: dto.summary,
        kind: dto.kind,
        visibility: dto.visibility,
        cityName: dto.cityName,
        provinceName: dto.provinceName,
        countryCode: dto.countryCode ?? 'CN',
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        coverMediaId: dto.coverMediaId,
      },
    });

    await this.logEvent(userId, 'trip_created', { tripId: trip.id }, trip.id);
    return this.getTrip(userId, trip.id);
  }

  async listTrips(userId: string, query: PaginationQueryDto) {
    await this.usersService.ensureExists(userId);

    const items = await this.prisma.trip.findMany({
      where: { ownerId: userId },
      include: {
        coverMedia: true,
        points: {
          orderBy: { sequence: 'asc' },
          include: { place: true, mediaAssets: true },
        },
      },
      orderBy: [{ updatedAt: 'desc' }],
      take: query.limit,
      skip: query.cursor ? 1 : 0,
      cursor: query.cursor ? { id: query.cursor } : undefined,
    });

    return {
      items,
      nextCursor: items.length === query.limit ? items[items.length - 1].id : null,
    };
  }

  async getTrip(userId: string, tripId: string) {
    const trip = await this.prisma.trip.findFirst({
      where: {
        id: tripId,
        ownerId: userId,
      },
      include: {
        coverMedia: true,
        points: {
          orderBy: [{ sequence: 'asc' }],
          include: {
            place: true,
            mediaAssets: {
              orderBy: [{ takenAt: 'asc' }, { createdAt: 'asc' }],
            },
          },
        },
        post: true,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  async updateTrip(userId: string, tripId: string, dto: UpdateTripDto) {
    await this.assertTripOwner(userId, tripId);

    await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        title: dto.title,
        summary: dto.summary,
        kind: dto.kind,
        visibility: dto.visibility,
        cityName: dto.cityName,
        provinceName: dto.provinceName,
        countryCode: dto.countryCode,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        coverMediaId: dto.coverMediaId,
      },
    });

    await this.refreshTripAggregates(tripId);
    return this.getTrip(userId, tripId);
  }

  async createPoint(userId: string, tripId: string, dto: CreateTripPointDto) {
    await this.assertTripOwner(userId, tripId);

    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: { points: true },
    });

    const place = dto.placeId
      ? await this.prisma.place.findUnique({
          where: { id: dto.placeId },
        })
      : null;

    const nextSequence = trip?.points.length
      ? Math.max(...trip.points.map((point) => point.sequence)) + 1
      : 1;

    const point = await this.prisma.tripPoint.create({
      data: {
        tripId,
        placeId: dto.placeId,
        customPlaceName: dto.customPlaceName,
        title: dto.title,
        note: dto.note,
        startedAt: new Date(dto.startedAt),
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        latitude: dto.latitude ?? place?.latitude?.toNumber(),
        longitude: dto.longitude ?? place?.longitude?.toNumber(),
        sequence: nextSequence,
        sourceType: dto.sourceType ?? PointSource.HYBRID,
        addressSnapshot: place
          ? {
              name: place.name,
              formattedAddress: place.formattedAddress,
              cityName: place.cityName,
              districtName: place.districtName,
            }
          : undefined,
      },
    });

    if (dto.mediaAssetIds?.length) {
      await this.prisma.mediaAsset.updateMany({
        where: {
          id: { in: dto.mediaAssetIds },
          ownerId: userId,
        },
        data: {
          tripId,
          tripPointId: point.id,
        },
      });
    }

    await this.refreshTripAggregates(tripId);
    await this.logEvent(userId, 'trip_point_created', { tripPointId: point.id }, tripId);
    return this.getTrip(userId, tripId);
  }

  async updatePoint(userId: string, tripId: string, pointId: string, dto: UpdateTripPointDto) {
    await this.assertTripOwner(userId, tripId);

    const point = await this.prisma.tripPoint.findFirst({
      where: {
        id: pointId,
        tripId,
      },
    });

    if (!point) {
      throw new NotFoundException('Trip point not found');
    }

    const place = dto.placeId
      ? await this.prisma.place.findUnique({
          where: { id: dto.placeId },
        })
      : null;

    await this.prisma.tripPoint.update({
      where: { id: pointId },
      data: {
        placeId: dto.placeId,
        customPlaceName: dto.customPlaceName,
        title: dto.title,
        note: dto.note,
        startedAt: dto.startedAt ? new Date(dto.startedAt) : undefined,
        endedAt: dto.endedAt ? new Date(dto.endedAt) : undefined,
        latitude: dto.latitude ?? place?.latitude?.toNumber(),
        longitude: dto.longitude ?? place?.longitude?.toNumber(),
        sourceType: dto.sourceType,
        addressSnapshot: place
          ? {
              name: place.name,
              formattedAddress: place.formattedAddress,
              cityName: place.cityName,
              districtName: place.districtName,
            }
          : point.addressSnapshot,
      },
    });

    if (dto.mediaAssetIds?.length) {
      await this.prisma.mediaAsset.updateMany({
        where: {
          id: { in: dto.mediaAssetIds },
          ownerId: userId,
          tripId,
        },
        data: {
          tripPointId: pointId,
        },
      });
    }

    await this.refreshTripAggregates(tripId);
    return this.getTrip(userId, tripId);
  }

  async deletePoint(userId: string, tripId: string, pointId: string) {
    await this.assertTripOwner(userId, tripId);

    const point = await this.prisma.tripPoint.findFirst({
      where: {
        id: pointId,
        tripId,
      },
    });

    if (!point) {
      throw new NotFoundException('Trip point not found');
    }

    await this.prisma.mediaAsset.updateMany({
      where: { tripPointId: pointId, ownerId: userId },
      data: { tripPointId: null },
    });

    await this.prisma.tripPoint.delete({
      where: { id: pointId },
    });

    await this.reindexPoints(tripId);
    await this.refreshTripAggregates(tripId);
    return this.getTrip(userId, tripId);
  }

  async reorderPoints(userId: string, tripId: string, dto: ReorderTripPointsDto) {
    await this.assertTripOwner(userId, tripId);

    const existingPoints = await this.prisma.tripPoint.findMany({
      where: { tripId },
      select: { id: true },
    });

    if (existingPoints.length !== dto.pointIds.length) {
      throw new BadRequestException('pointIds must include every point exactly once');
    }

    const existingPointIds = new Set(existingPoints.map((point) => point.id));
    for (const pointId of dto.pointIds) {
      if (!existingPointIds.has(pointId)) {
        throw new BadRequestException(`Unknown point id: ${pointId}`);
      }
    }

    await this.prisma.$transaction(
      dto.pointIds.map((pointId, index) =>
        this.prisma.tripPoint.update({
          where: { id: pointId },
          data: { sequence: index + 1 },
        }),
      ),
    );

    await this.refreshTripAggregates(tripId);
    return this.getTrip(userId, tripId);
  }

  async autoAssembleTrip(userId: string, tripId: string, dto: AutoAssembleTripDto) {
    await this.assertTripOwner(userId, tripId);

    const mediaAssets = await this.prisma.mediaAsset.findMany({
      where: {
        ownerId: userId,
        tripId,
        id: dto.mediaAssetIds?.length ? { in: dto.mediaAssetIds } : undefined,
      },
      orderBy: [{ takenAt: 'asc' }, { createdAt: 'asc' }],
    });

    if (!mediaAssets.length) {
      throw new BadRequestException('No media assets available to assemble');
    }

    const autoPoints = await this.prisma.tripPoint.findMany({
      where: {
        tripId,
        sourceType: PointSource.AUTO,
      },
      select: { id: true },
    });

    if (autoPoints.length) {
      await this.prisma.mediaAsset.updateMany({
        where: {
          tripPointId: {
            in: autoPoints.map((point) => point.id),
          },
        },
        data: {
          tripPointId: null,
        },
      });
    }

    await this.prisma.tripPoint.deleteMany({
      where: {
        tripId,
        sourceType: PointSource.AUTO,
      },
    });

    const clusters: Array<{
      startedAt: Date;
      endedAt: Date;
      latitude?: number | null;
      longitude?: number | null;
      mediaAssetIds: string[];
    }> = [];

    for (const mediaAsset of mediaAssets) {
      const takenAt = mediaAsset.takenAt ?? mediaAsset.createdAt;
      const latitude = mediaAsset.exifLatitude?.toNumber() ?? null;
      const longitude = mediaAsset.exifLongitude?.toNumber() ?? null;
      const currentCluster = clusters[clusters.length - 1];

      if (!currentCluster) {
        clusters.push({
          startedAt: takenAt,
          endedAt: takenAt,
          latitude,
          longitude,
          mediaAssetIds: [mediaAsset.id],
        });
        continue;
      }

      const timeGapMinutes =
        (takenAt.getTime() - currentCluster.endedAt.getTime()) / (1000 * 60);
      const distanceGapKm = haversineInKm(
        currentCluster.latitude,
        currentCluster.longitude,
        latitude,
        longitude,
      );

      const shouldSplit =
        timeGapMinutes > (dto.timeGapMinutes ?? 120) ||
        (distanceGapKm !== null && distanceGapKm > (dto.distanceGapKm ?? 5));

      if (shouldSplit) {
        clusters.push({
          startedAt: takenAt,
          endedAt: takenAt,
          latitude,
          longitude,
          mediaAssetIds: [mediaAsset.id],
        });
      } else {
        currentCluster.endedAt = takenAt;
        currentCluster.mediaAssetIds.push(mediaAsset.id);
        currentCluster.latitude = latitude ?? currentCluster.latitude;
        currentCluster.longitude = longitude ?? currentCluster.longitude;
      }
    }

    const existingManualPoints = await this.prisma.tripPoint.count({
      where: {
        tripId,
        sourceType: {
          not: PointSource.AUTO,
        },
      },
    });

    const createdPoints = await this.prisma.$transaction(
      clusters.map((cluster, index) =>
        this.prisma.tripPoint.create({
          data: {
            tripId,
            title: `Point ${index + 1}`,
            startedAt: cluster.startedAt,
            endedAt: cluster.endedAt,
            latitude: cluster.latitude,
            longitude: cluster.longitude,
            sequence: existingManualPoints + index + 1,
            sourceType: PointSource.AUTO,
          },
        }),
      ),
    );

    await this.prisma.$transaction(
      createdPoints.map((point, index) =>
        this.prisma.mediaAsset.updateMany({
          where: {
            id: { in: clusters[index].mediaAssetIds },
            ownerId: userId,
          },
          data: {
            tripPointId: point.id,
          },
        }),
      ),
    );

    await this.reindexPoints(tripId);
    await this.refreshTripAggregates(tripId);
    await this.logEvent(
      userId,
      'trip_auto_assembled',
      {
        clusterCount: clusters.length,
        mediaCount: mediaAssets.length,
      },
      tripId,
    );

    return this.getTrip(userId, tripId);
  }

  async publishTrip(userId: string, tripId: string, dto: PublishTripDto) {
    const trip = await this.assertTripOwner(userId, tripId);

    if (!trip.pointCount) {
      throw new BadRequestException('Trip must contain at least one point before publishing');
    }

    const title = dto.title ?? trip.title;
    const summary = dto.summary ?? trip.summary;
    const coverMediaId = dto.coverMediaId ?? trip.coverMediaId;
    const visibility = dto.visibility ?? Visibility.PUBLIC;

    await this.prisma.trip.update({
      where: { id: tripId },
      data: {
        title,
        summary,
        coverMediaId,
        visibility,
        status: TripStatus.PUBLISHED,
        publishedAt: new Date(),
      },
    });

    await this.prisma.post.upsert({
      where: { tripId },
      create: {
        tripId,
        authorId: userId,
        title,
        summary,
        cityName: trip.cityName,
        coverMediaId,
        pointCount: trip.pointCount,
        mediaCount: trip.mediaCount,
        visibility,
      },
      update: {
        title,
        summary,
        cityName: trip.cityName,
        coverMediaId,
        pointCount: trip.pointCount,
        mediaCount: trip.mediaCount,
        visibility,
        publishedAt: new Date(),
      },
    });

    await this.logEvent(userId, 'trip_published', { visibility }, tripId);
    return this.getTrip(userId, tripId);
  }

  private async refreshTripAggregates(tripId: string) {
    const points = await this.prisma.tripPoint.findMany({
      where: { tripId },
      orderBy: [{ sequence: 'asc' }],
      include: {
        mediaAssets: true,
      },
    });

    const pointCount = points.length;
    const mediaCount = points.reduce((count, point) => count + point.mediaAssets.length, 0);
    const startedAt = points[0]?.startedAt ?? null;
    const endedAt = points[points.length - 1]?.endedAt ?? points[points.length - 1]?.startedAt ?? null;
    const routePreview = points
      .filter((point) => point.latitude !== null && point.longitude !== null)
      .map((point) => ({
        pointId: point.id,
        sequence: point.sequence,
        latitude: point.latitude?.toNumber(),
        longitude: point.longitude?.toNumber(),
      }));

    await this.prisma.$transaction(async (tx) => {
      for (const point of points) {
        await tx.tripPoint.update({
          where: { id: point.id },
          data: {
            mediaCount: point.mediaAssets.length,
          },
        });
      }

      await tx.trip.update({
        where: { id: tripId },
        data: {
          pointCount,
          mediaCount,
          startedAt,
          endedAt,
          routePreview,
        },
      });

      const post = await tx.post.findUnique({ where: { tripId } });
      if (post) {
        await tx.post.update({
          where: { tripId },
          data: {
            pointCount,
            mediaCount,
          },
        });
      }
    });
  }

  private async reindexPoints(tripId: string) {
    const points = await this.prisma.tripPoint.findMany({
      where: { tripId },
      orderBy: [{ sequence: 'asc' }, { startedAt: 'asc' }],
    });

    await this.prisma.$transaction(
      points.map((point, index) =>
        this.prisma.tripPoint.update({
          where: { id: point.id },
          data: { sequence: index + 1 },
        }),
      ),
    );
  }

  private async assertTripOwner(userId: string, tripId: string) {
    await this.usersService.ensureExists(userId);

    const trip = await this.prisma.trip.findFirst({
      where: {
        id: tripId,
        ownerId: userId,
      },
    });

    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    return trip;
  }

  private async logEvent(
    userId: string,
    eventType: string,
    payload?: Prisma.InputJsonValue,
    tripId?: string,
    postId?: string,
  ) {
    await this.prisma.userActionEvent.create({
      data: {
        userId,
        tripId,
        postId,
        eventType,
        payload,
      },
    });
  }
}
