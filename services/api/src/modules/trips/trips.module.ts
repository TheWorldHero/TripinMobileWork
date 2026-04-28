import { Module } from '@nestjs/common';
import { MediaModule } from '../media/media.module';
import { PlacesModule } from '../places/places.module';
import { UsersModule } from '../users/users.module';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [UsersModule, PlacesModule, MediaModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
