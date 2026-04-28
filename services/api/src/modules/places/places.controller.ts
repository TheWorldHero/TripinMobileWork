import { Body, Controller, Get, Post, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { CreatePlaceDto } from './dto/create-place.dto';
import { ReverseGeocodeDto } from './dto/reverse-geocode.dto';
import { SearchPlacesDto } from './dto/search-places.dto';
import { StaticMapQueryDto } from './dto/static-map-query.dto';
import { PlacesService } from './places.service';

@ApiTags('places')
@Controller('v1/places')
export class PlacesController {
  constructor(private readonly placesService: PlacesService) {}

  @Post()
  upsert(@Body() dto: CreatePlaceDto) {
    return this.placesService.upsert(dto);
  }

  @Get('search')
  search(@Query() query: SearchPlacesDto) {
    return this.placesService.search(query);
  }

  @Get('suggest')
  suggest(@Query() query: SearchPlacesDto) {
    return this.placesService.suggest(query);
  }

  @Get('reverse-geocode')
  reverseGeocode(@Query() query: ReverseGeocodeDto) {
    return this.placesService.reverseGeocode(query);
  }

  @Get('status')
  getStatus() {
    return this.placesService.getProviderStatus();
  }

  @Get('static-map')
  async staticMap(@Query() query: StaticMapQueryDto, @Res() res: Response) {
    const image = await this.placesService.getStaticMapImage(query);
    res.setHeader('Content-Type', image.contentType);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(image.body);
  }
}
