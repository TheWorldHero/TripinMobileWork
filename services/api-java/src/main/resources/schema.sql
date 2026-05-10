CREATE EXTENSION IF NOT EXISTS postgis;

-- Enum types are created via a PL/pgSQL block because Postgres has no
-- CREATE TYPE IF NOT EXISTS. Tagged dollar-quoting ($body$) is used so the
-- block survives Spring's SQL splitter, which only mishandles the unnamed
-- $$ tag.
DO $body$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'UserStatus') THEN
    CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TripKind') THEN
    CREATE TYPE "TripKind" AS ENUM ('TRAVEL', 'LIFESTYLE', 'MIXED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'TripStatus') THEN
    CREATE TYPE "TripStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Visibility') THEN
    CREATE TYPE "Visibility" AS ENUM ('PRIVATE', 'PUBLIC', 'UNLISTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PointSource') THEN
    CREATE TYPE "PointSource" AS ENUM ('AUTO', 'MANUAL', 'HYBRID');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PlaceProvider') THEN
    CREATE TYPE "PlaceProvider" AS ENUM ('AMAP', 'MANUAL', 'IMPORTED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'MediaStatus') THEN
    CREATE TYPE "MediaStatus" AS ENUM ('PENDING', 'READY', 'FAILED');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PostStatus') THEN
    CREATE TYPE "PostStatus" AS ENUM ('ACTIVE', 'HIDDEN', 'ARCHIVED');
  END IF;
END $body$;

CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT PRIMARY KEY,
  "email" TEXT UNIQUE,
  "username" TEXT UNIQUE,
  "displayName" TEXT NOT NULL,
  "avatarUrl" TEXT,
  "bio" TEXT,
  "passwordHash" TEXT,
  "passwordSalt" TEXT,
  "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "email" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordSalt" TEXT;

CREATE TABLE IF NOT EXISTS "Place" (
  "id" TEXT PRIMARY KEY,
  "provider" "PlaceProvider" NOT NULL,
  "providerId" TEXT,
  "name" TEXT NOT NULL,
  "shortName" TEXT,
  "formattedAddress" TEXT,
  "provinceName" TEXT,
  "cityName" TEXT,
  "districtName" TEXT,
  "countryCode" TEXT NOT NULL DEFAULT 'CN',
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Trip" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "kind" "TripKind" NOT NULL DEFAULT 'MIXED',
  "status" "TripStatus" NOT NULL DEFAULT 'DRAFT',
  "visibility" "Visibility" NOT NULL DEFAULT 'PRIVATE',
  "isLine" BOOLEAN NOT NULL DEFAULT FALSE,
  "cityName" TEXT,
  "provinceName" TEXT,
  "countryCode" TEXT NOT NULL DEFAULT 'CN',
  "coverMediaId" TEXT,
  "startedAt" TIMESTAMP(3),
  "endedAt" TIMESTAMP(3),
  "isCompleted" BOOLEAN NOT NULL DEFAULT FALSE,
  "totalDistanceMeters" BIGINT NOT NULL DEFAULT 0,
  "totalDurationSeconds" BIGINT NOT NULL DEFAULT 0,
  "pointCount" INTEGER NOT NULL DEFAULT 0,
  "mediaCount" INTEGER NOT NULL DEFAULT 0,
  "routePreview" JSONB,
  "publishedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "TripPoint" (
  "id" TEXT PRIMARY KEY,
  "tripId" TEXT NOT NULL,
  "placeId" TEXT,
  "title" TEXT,
  "note" TEXT,
  "customPlaceName" TEXT,
  "startedAt" TIMESTAMP(3) NOT NULL,
  "endedAt" TIMESTAMP(3),
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "sequence" INTEGER NOT NULL,
  "sourceType" "PointSource" NOT NULL DEFAULT 'HYBRID',
  "mediaCount" INTEGER NOT NULL DEFAULT 0,
  "addressSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Point" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "placeId" TEXT,
  "title" TEXT,
  "note" TEXT,
  "capturedAt" TIMESTAMP(3),
  "checkInAt" TIMESTAMP(3),
  "latitude" DECIMAL(10,7),
  "longitude" DECIMAL(10,7),
  "mediaCount" INTEGER NOT NULL DEFAULT 0,
  "mediaAssetIds" JSONB,
  "addressSnapshot" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "LinePoint" (
  "id" TEXT PRIMARY KEY,
  "lineId" TEXT NOT NULL,
  "pointId" TEXT NOT NULL,
  "sequence" INTEGER NOT NULL,
  "arrivalAt" TIMESTAMP(3),
  "departureAt" TIMESTAMP(3),
  "isLocked" BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS "RouteSegment" (
  "id" TEXT PRIMARY KEY,
  "lineId" TEXT NOT NULL,
  "fromPointId" TEXT NOT NULL,
  "toPointId" TEXT NOT NULL,
  "provider" TEXT NOT NULL,
  "distanceMeters" BIGINT NOT NULL DEFAULT 0,
  "durationSeconds" BIGINT NOT NULL DEFAULT 0,
  "polyline" TEXT NOT NULL,
  "strategy" TEXT NOT NULL,
  "rawRoutePayload" JSONB,
  "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "MediaAsset" (
  "id" TEXT PRIMARY KEY,
  "ownerId" TEXT NOT NULL,
  "tripId" TEXT,
  "tripPointId" TEXT,
  "storageKey" TEXT NOT NULL,
  "bucket" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "bytes" INTEGER NOT NULL,
  "width" INTEGER,
  "height" INTEGER,
  "takenAt" TIMESTAMP(3),
  "exifLatitude" DECIMAL(10,7),
  "exifLongitude" DECIMAL(10,7),
  "caption" TEXT,
  "status" "MediaStatus" NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Post" (
  "id" TEXT PRIMARY KEY,
  "tripId" TEXT NOT NULL UNIQUE,
  "authorId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "cityName" TEXT,
  "coverMediaId" TEXT,
  "pointCount" INTEGER NOT NULL DEFAULT 0,
  "mediaCount" INTEGER NOT NULL DEFAULT 0,
  "status" "PostStatus" NOT NULL DEFAULT 'ACTIVE',
  "visibility" "Visibility" NOT NULL DEFAULT 'PUBLIC',
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PostLike" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "PostSave" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "Comment" (
  "id" TEXT PRIMARY KEY,
  "postId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "FeedImpression" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "postId" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "position" INTEGER,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS "UserActionEvent" (
  "id" TEXT PRIMARY KEY,
  "userId" TEXT,
  "tripId" TEXT,
  "postId" TEXT,
  "eventType" TEXT NOT NULL,
  "payload" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Foreign keys are made idempotent via paired DROP CONSTRAINT IF EXISTS / ADD CONSTRAINT
-- statements. This is plain SQL, so any splitter (Spring SQL init, psql, etc.) handles it.
-- Each pair is functionally equivalent to the previous PL/pgSQL "ADD if not exists" check.
ALTER TABLE "Trip" DROP CONSTRAINT IF EXISTS "Trip_ownerId_fkey";
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Trip" DROP CONSTRAINT IF EXISTS "Trip_coverMediaId_fkey";
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_coverMediaId_fkey"
  FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "TripPoint" DROP CONSTRAINT IF EXISTS "TripPoint_tripId_fkey";
ALTER TABLE "TripPoint" ADD CONSTRAINT "TripPoint_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "TripPoint" DROP CONSTRAINT IF EXISTS "TripPoint_placeId_fkey";
ALTER TABLE "TripPoint" ADD CONSTRAINT "TripPoint_placeId_fkey"
  FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Point" DROP CONSTRAINT IF EXISTS "Point_ownerId_fkey";
ALTER TABLE "Point" ADD CONSTRAINT "Point_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Point" DROP CONSTRAINT IF EXISTS "Point_placeId_fkey";
ALTER TABLE "Point" ADD CONSTRAINT "Point_placeId_fkey"
  FOREIGN KEY ("placeId") REFERENCES "Place"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LinePoint" DROP CONSTRAINT IF EXISTS "LinePoint_lineId_fkey";
ALTER TABLE "LinePoint" ADD CONSTRAINT "LinePoint_lineId_fkey"
  FOREIGN KEY ("lineId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LinePoint" DROP CONSTRAINT IF EXISTS "LinePoint_pointId_fkey";
ALTER TABLE "LinePoint" ADD CONSTRAINT "LinePoint_pointId_fkey"
  FOREIGN KEY ("pointId") REFERENCES "Point"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RouteSegment" DROP CONSTRAINT IF EXISTS "RouteSegment_lineId_fkey";
ALTER TABLE "RouteSegment" ADD CONSTRAINT "RouteSegment_lineId_fkey"
  FOREIGN KEY ("lineId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RouteSegment" DROP CONSTRAINT IF EXISTS "RouteSegment_fromPointId_fkey";
ALTER TABLE "RouteSegment" ADD CONSTRAINT "RouteSegment_fromPointId_fkey"
  FOREIGN KEY ("fromPointId") REFERENCES "Point"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "RouteSegment" DROP CONSTRAINT IF EXISTS "RouteSegment_toPointId_fkey";
ALTER TABLE "RouteSegment" ADD CONSTRAINT "RouteSegment_toPointId_fkey"
  FOREIGN KEY ("toPointId") REFERENCES "Point"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MediaAsset" DROP CONSTRAINT IF EXISTS "MediaAsset_ownerId_fkey";
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_ownerId_fkey"
  FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "MediaAsset" DROP CONSTRAINT IF EXISTS "MediaAsset_tripId_fkey";
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "MediaAsset" DROP CONSTRAINT IF EXISTS "MediaAsset_tripPointId_fkey";
ALTER TABLE "MediaAsset" ADD CONSTRAINT "MediaAsset_tripPointId_fkey"
  FOREIGN KEY ("tripPointId") REFERENCES "TripPoint"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_tripId_fkey";
ALTER TABLE "Post" ADD CONSTRAINT "Post_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_authorId_fkey";
ALTER TABLE "Post" ADD CONSTRAINT "Post_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Post" DROP CONSTRAINT IF EXISTS "Post_coverMediaId_fkey";
ALTER TABLE "Post" ADD CONSTRAINT "Post_coverMediaId_fkey"
  FOREIGN KEY ("coverMediaId") REFERENCES "MediaAsset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "PostLike" DROP CONSTRAINT IF EXISTS "PostLike_postId_fkey";
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostLike" DROP CONSTRAINT IF EXISTS "PostLike_userId_fkey";
ALTER TABLE "PostLike" ADD CONSTRAINT "PostLike_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostSave" DROP CONSTRAINT IF EXISTS "PostSave_postId_fkey";
ALTER TABLE "PostSave" ADD CONSTRAINT "PostSave_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PostSave" DROP CONSTRAINT IF EXISTS "PostSave_userId_fkey";
ALTER TABLE "PostSave" ADD CONSTRAINT "PostSave_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_postId_fkey";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Comment" DROP CONSTRAINT IF EXISTS "Comment_userId_fkey";
ALTER TABLE "Comment" ADD CONSTRAINT "Comment_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FeedImpression" DROP CONSTRAINT IF EXISTS "FeedImpression_userId_fkey";
ALTER TABLE "FeedImpression" ADD CONSTRAINT "FeedImpression_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FeedImpression" DROP CONSTRAINT IF EXISTS "FeedImpression_postId_fkey";
ALTER TABLE "FeedImpression" ADD CONSTRAINT "FeedImpression_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserActionEvent" DROP CONSTRAINT IF EXISTS "UserActionEvent_userId_fkey";
ALTER TABLE "UserActionEvent" ADD CONSTRAINT "UserActionEvent_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UserActionEvent" DROP CONSTRAINT IF EXISTS "UserActionEvent_tripId_fkey";
ALTER TABLE "UserActionEvent" ADD CONSTRAINT "UserActionEvent_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserActionEvent" DROP CONSTRAINT IF EXISTS "UserActionEvent_postId_fkey";
ALTER TABLE "UserActionEvent" ADD CONSTRAINT "UserActionEvent_postId_fkey"
  FOREIGN KEY ("postId") REFERENCES "Post"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "Place_provider_providerId_key" ON "Place"("provider", "providerId");
CREATE INDEX IF NOT EXISTS "Place_name_idx" ON "Place"("name");
CREATE INDEX IF NOT EXISTS "Place_cityName_idx" ON "Place"("cityName");
CREATE UNIQUE INDEX IF NOT EXISTS "User_email_key" ON "User"("email");

CREATE INDEX IF NOT EXISTS "Trip_ownerId_status_updatedAt_idx" ON "Trip"("ownerId", "status", "updatedAt");
CREATE INDEX IF NOT EXISTS "Trip_visibility_publishedAt_idx" ON "Trip"("visibility", "publishedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "TripPoint_tripId_sequence_key" ON "TripPoint"("tripId", "sequence");
CREATE INDEX IF NOT EXISTS "TripPoint_tripId_startedAt_idx" ON "TripPoint"("tripId", "startedAt");

CREATE INDEX IF NOT EXISTS "Point_ownerId_createdAt_idx" ON "Point"("ownerId", "createdAt");
CREATE INDEX IF NOT EXISTS "Point_placeId_idx" ON "Point"("placeId");

CREATE UNIQUE INDEX IF NOT EXISTS "LinePoint_lineId_sequence_key" ON "LinePoint"("lineId", "sequence");
CREATE INDEX IF NOT EXISTS "LinePoint_lineId_sequence_idx" ON "LinePoint"("lineId", "sequence");
CREATE INDEX IF NOT EXISTS "LinePoint_pointId_idx" ON "LinePoint"("pointId");

CREATE INDEX IF NOT EXISTS "RouteSegment_lineId_idx" ON "RouteSegment"("lineId");
CREATE INDEX IF NOT EXISTS "RouteSegment_fromPointId_toPointId_idx" ON "RouteSegment"("fromPointId", "toPointId");

CREATE INDEX IF NOT EXISTS "MediaAsset_ownerId_createdAt_idx" ON "MediaAsset"("ownerId", "createdAt");
CREATE INDEX IF NOT EXISTS "MediaAsset_tripId_tripPointId_idx" ON "MediaAsset"("tripId", "tripPointId");
CREATE INDEX IF NOT EXISTS "MediaAsset_takenAt_idx" ON "MediaAsset"("takenAt");

CREATE INDEX IF NOT EXISTS "Post_status_visibility_publishedAt_idx" ON "Post"("status", "visibility", "publishedAt");
CREATE INDEX IF NOT EXISTS "Post_authorId_publishedAt_idx" ON "Post"("authorId", "publishedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "PostLike_postId_userId_key" ON "PostLike"("postId", "userId");
CREATE INDEX IF NOT EXISTS "PostLike_userId_createdAt_idx" ON "PostLike"("userId", "createdAt");

CREATE UNIQUE INDEX IF NOT EXISTS "PostSave_postId_userId_key" ON "PostSave"("postId", "userId");
CREATE INDEX IF NOT EXISTS "PostSave_userId_createdAt_idx" ON "PostSave"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "Comment_postId_createdAt_idx" ON "Comment"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "Comment_userId_createdAt_idx" ON "Comment"("userId", "createdAt");

CREATE INDEX IF NOT EXISTS "FeedImpression_userId_createdAt_idx" ON "FeedImpression"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "FeedImpression_postId_createdAt_idx" ON "FeedImpression"("postId", "createdAt");

CREATE INDEX IF NOT EXISTS "UserActionEvent_userId_createdAt_idx" ON "UserActionEvent"("userId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserActionEvent_postId_createdAt_idx" ON "UserActionEvent"("postId", "createdAt");
CREATE INDEX IF NOT EXISTS "UserActionEvent_tripId_createdAt_idx" ON "UserActionEvent"("tripId", "createdAt");
