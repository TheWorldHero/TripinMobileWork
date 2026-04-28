import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { ApiHeader, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from '../../common/decorators/current-user-id.decorator';
import { PaginationQueryDto } from '../../common/dto/pagination-query.dto';
import { AutoAssembleTripDto } from './dto/auto-assemble-trip.dto';
import { CreateTripPointDto } from './dto/create-trip-point.dto';
import { CreateTripDto } from './dto/create-trip.dto';
import { PublishTripDto } from './dto/publish-trip.dto';
import { ReorderTripPointsDto } from './dto/reorder-trip-points.dto';
import { UpdateTripPointDto } from './dto/update-trip-point.dto';
import { UpdateTripDto } from './dto/update-trip.dto';
import { TripsService } from './trips.service';

@ApiTags('trips')
@ApiHeader({
  name: 'x-user-id',
  required: false,
  description: 'Temporary dev auth header. Falls back to DEMO_USER_ID.',
})
@Controller('v1/trips')
export class TripsController {
  constructor(private readonly tripsService: TripsService) {}

  @Post()
  create(@CurrentUserId() userId: string, @Body() dto: CreateTripDto) {
    return this.tripsService.createTrip(userId, dto);
  }

  @Get()
  list(@CurrentUserId() userId: string, @Query() query: PaginationQueryDto) {
    return this.tripsService.listTrips(userId, query);
  }

  @Get(':tripId')
  getOne(@CurrentUserId() userId: string, @Param('tripId') tripId: string) {
    return this.tripsService.getTrip(userId, tripId);
  }

  @Patch(':tripId')
  update(
    @CurrentUserId() userId: string,
    @Param('tripId') tripId: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.tripsService.updateTrip(userId, tripId, dto);
  }

  @Post(':tripId/points')
  createPoint(
    @CurrentUserId() userId: string,
    @Param('tripId') tripId: string,
    @Body() dto: CreateTripPointDto,
  ) {
    return this.tripsService.createPoint(userId, tripId, dto);
  }

  @Patch(':tripId/points/:pointId')
  updatePoint(
    @CurrentUserId() userId: string,
    @Param('tripId') tripId: string,
    @Param('pointId') pointId: string,
    @Body() dto: UpdateTripPointDto,
  ) {
    return this.tripsService.updatePoint(userId, tripId, pointId, dto);
  }

  @Delete(':tripId/points/:pointId')
  deletePoint(
    @CurrentUserId() userId: string,
    @Param('tripId') tripId: string,
    @Param('pointId') pointId: string,
  ) {
    return this.tripsService.deletePoint(userId, tripId, pointId);
  }

  @Post(':tripId/points/reorder')
  reorderPoints(
    @CurrentUserId() userId: string,
    @Param('tripId') tripId: string,
    @Body() dto: ReorderTripPointsDto,
  ) {
    return this.tripsService.reorderPoints(userId, tripId, dto);
  }

  @Post(':tripId/auto-assemble')
  autoAssemble(
    @CurrentUserId() userId: string,
    @Param('tripId') tripId: string,
    @Body() dto: AutoAssembleTripDto,
  ) {
    return this.tripsService.autoAssembleTrip(userId, tripId, dto);
  }

  @Post(':tripId/publish')
  publish(
    @CurrentUserId() userId: string,
    @Param('tripId') tripId: string,
    @Body() dto: PublishTripDto,
  ) {
    return this.tripsService.publishTrip(userId, tripId, dto);
  }
}

