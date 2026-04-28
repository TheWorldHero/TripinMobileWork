import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { PrismaModule } from './common/prisma/prisma.module';
import { DevSupportModule } from './modules/dev-support/dev-support.module';
import { FeedModule } from './modules/feed/feed.module';
import { HealthModule } from './modules/health/health.module';
import { InteractionsModule } from './modules/interactions/interactions.module';
import { MediaModule } from './modules/media/media.module';
import { PlacesModule } from './modules/places/places.module';
import { PostsModule } from './modules/posts/posts.module';
import { TripsModule } from './modules/trips/trips.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [join(__dirname, '../.env'), '.env'],
    }),
    PrismaModule,
    DevSupportModule,
    HealthModule,
    UsersModule,
    PlacesModule,
    MediaModule,
    TripsModule,
    PostsModule,
    FeedModule,
    InteractionsModule,
  ],
})
export class AppModule {}
