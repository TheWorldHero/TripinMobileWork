import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { CreateMediaAssetDto } from './dto/create-media-asset.dto';
import { MarkMediaReadyDto } from './dto/mark-media-ready.dto';
import { MediaService } from './media.service';

@ApiTags('media')
@ApiHeader({
  name: 'x-user-id',
  required: false,
  description: 'Temporary dev auth header. Falls back to DEMO_USER_ID.',
})
@Controller('v1/media/assets')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateMediaAssetDto) {
    return this.mediaService.create(userId, dto);
  }

  @Post(':mediaAssetId/mark-ready')
  markReady(
    @CurrentUserId() userId: string,
    @Param('mediaAssetId') mediaAssetId: string,
    @Body() dto: MarkMediaReadyDto,
  ) {
    return this.mediaService.markReady(userId, mediaAssetId, dto);
  }

  @Get(':mediaAssetId')
  getOne(@CurrentUserId() userId: string, @Param('mediaAssetId') mediaAssetId: string) {
    return this.mediaService.getOne(userId, mediaAssetId);
  }
}

