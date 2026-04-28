import { Injectable, NotFoundException } from '@nestjs/common';
import { MediaStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { MarkMediaReadyDto } from './dto/mark-media-ready.dto';

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(userId: string, dto: CreateMediaAssetDto) {
    await this.usersService.ensureExists(userId);

    const bucket = process.env.DEFAULT_MEDIA_BUCKET ?? 'tripin-media';
    const storageKey = `${userId}/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${dto.originalName}`;

    return this.prisma.mediaAsset.create({
      data: {
        ownerId: userId,
        tripId: dto.tripId,
        tripPointId: dto.tripPointId,
        bucket,
        storageKey,
        originalName: dto.originalName,
        mimeType: dto.mimeType,
        bytes: dto.bytes,
        width: dto.width,
        height: dto.height,
        takenAt: dto.takenAt ? new Date(dto.takenAt) : undefined,
        exifLatitude: dto.exifLatitude,
        exifLongitude: dto.exifLongitude,
        caption: dto.caption,
        status: MediaStatus.PENDING,
      },
    });
  }

  async markReady(userId: string, mediaAssetId: string, dto: MarkMediaReadyDto) {
    const mediaAsset = await this.prisma.mediaAsset.findFirst({
      where: {
        id: mediaAssetId,
        ownerId: userId,
      },
    });

    if (!mediaAsset) {
      throw new NotFoundException('Media asset not found');
    }

    return this.prisma.mediaAsset.update({
      where: { id: mediaAssetId },
      data: {
        status: MediaStatus.READY,
        storageKey: dto.storageKey ?? mediaAsset.storageKey,
      },
    });
  }

  async getOne(userId: string, mediaAssetId: string) {
    const mediaAsset = await this.prisma.mediaAsset.findFirst({
      where: {
        id: mediaAssetId,
        ownerId: userId,
      },
    });

    if (!mediaAsset) {
      throw new NotFoundException('Media asset not found');
    }

    return mediaAsset;
  }
}
