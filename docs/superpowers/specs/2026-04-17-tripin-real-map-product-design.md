# TripIn Real-Map Product Design

Date: 2026-04-17
Status: Draft approved in conversation, written for review
Supersedes: `docs/superpowers/specs/2026-04-16-tripin-point-to-line-design.md`

## 1. Summary

TripIn's target product is not a map-first utility app that opens directly into a map canvas. It is a community-led life and travel route product where:

1. The user first enters a mixed community home feed.
2. Recording starts from a prominent action button, not from the map itself.
3. A point is created from media first, then completed with a real place.
4. The map appears when the user needs to confirm a point location or edit a line.
5. Finished lines become the main shareable social object.

The final product depends on real map capabilities in production. For mainland China, the recommended provider stack is AMap across mobile SDKs, JS API, and Web Service APIs.

## 2. Product Positioning

### Primary direction

- Community home is the default entry
- Recording and line editing are the creation backbone
- Route sharing and recommendation are part of the final product shape
- Trip planning is still out of near-term scope

### Product thesis

TripIn should let users turn scattered photos and check-ins into beautiful, replayable, shareable lines that still feel grounded in real places and real routes.

This means:

- A point is still the basic creation unit
- A line is still the core content unit
- The homepage should feel like a social product, not a map tool
- The map should appear at high-value moments, not dominate the product at all times

## 3. Core Product Principles

### 3.1 Community first entry, task-driven map usage

The app opens into a mixed social feed. The map should not be the default first screen. It should appear only when the user is confirming location, editing a line, or reviewing map-rich route content.

### 3.2 Point first, line centered

Users create points. The system and the user together shape those points into a line. The line remains the main object for replay, sharing, and recommendation.

### 3.3 Real place, not loose text

The product should prioritize structured places and real location confirmation over freeform location strings. Users should be able to search POIs, choose nearby places, or correct positions on a map.

### 3.4 Real map dependencies, provider-independent business model

The shipped product requires real map SDKs and APIs. However, business entities should remain provider-independent enough that TripIn stores its own points, places, lines, and route segments instead of persisting UI SDK objects directly.

### 3.5 Lifestyle map expression

TripIn should not look like a generic navigation app. The map experience should feel lifestyle-oriented, with emphasis on marker style, route style, cards, and visual rhythm. In version one, trajectory and point expression matter more than extreme base map styling depth.

## 4. Experience Structure

### 4.1 Home feed

The default first screen is a mixed community feed:

- Recommended content
- Following content
- A strong center action button for creation
- Entry points into route detail, profile, and notifications

The feed should remain the emotional and social front door of the app.

### 4.2 Creation entry

The primary creation entry is the bottom-center main action button.

Pressing it opens an action sheet with at least:

- Take photo
- Import from album
- Backfill one point
- Continue editing a line

This keeps creation one tap away without replacing the home feed with a tool surface.

### 4.3 Location confirmation page

After media is selected, the system first creates a draft point, then guides the user to confirm location. This is the first map-heavy task page.

The location confirmation page should support:

- Map display and interaction
- Current location selection
- Searchable real POIs
- Nearby POI suggestions
- Drag or tap to correct position
- Selection of the final place tied to the point

Default recommendation order:

1. Photo EXIF location if present
2. Current device location if available
3. Nearby POI candidates

### 4.4 Line editor

The line editor is the second core map-heavy page.

Its main job is to turn a set of points into an ordered, route-backed, publishable line. The map is justified here because the user has entered a deliberate editing task.

The editor must support:

- Reordering points
- Changing point locations
- Adding points
- Removing points
- Recalculating routes
- Reviewing the full route on a map

### 4.5 Route detail and sharing

Finished lines become shareable route content. Route detail pages on mobile and web should combine:

- Map route expression
- Point list
- Photos
- Summary text
- Social interactions

## 5. End-To-End User Flow

### 5.1 Entering from home

The user lands on the community home feed, not a map.

### 5.2 Starting creation

The user presses the center action button and selects one of the creation actions.

### 5.3 Creating a point from media

After taking or selecting a photo:

- The app immediately creates a draft point
- The user is guided to the location confirmation step
- The user may skip location completion temporarily if needed

This ensures the product captures the moment first and refines it second.

### 5.4 Confirming location

On the location confirmation page, the user can:

- Accept a recommended place
- Use current location
- Search for a POI
- Move the point on a map

The outcome is a point bound to real geographic data.

### 5.5 Choosing point destination

If there is an active editing line, the app shows a lightweight choice:

- Add to current line
- Put in inbox

If there is no active line, the point goes to the inbox by default.

### 5.6 Editing the line

The user opens a line editor on mobile or web. The line editor shows:

- Ordered points
- Map route and point overlays
- Route recalculation status
- Completion state

### 5.7 Publishing and consuming

Once the line is complete, it can be published into the social system and appear in the community feed, route detail pages, and recommendation surfaces.

## 6. Platform Architecture

### 6.1 Mobile

Recommended shape:

- React Native + Expo as the product shell
- Expo Prebuild / Dev Client instead of pure Expo Go assumptions
- Custom native AMap modules for Android and iOS

The mobile app is responsible for:

- Social feed consumption
- Creation entry sheet
- Media capture/import
- Draft point creation
- Location confirmation
- Line editing
- Route viewing and sharing

Native map modules are required primarily for:

- Location confirmation page
- Line editor
- Route-rich detail experiences

### 6.2 Web

Recommended shape:

- React or Next.js
- AMap JS API

The web app is responsible for:

- Public and private route viewing
- Share landing pages
- Web line editing
- Content management and operational tooling

Web is not only a read-only share surface. It must support line editing in the final product.

### 6.3 Backend

Recommended shape:

- Spring Boot
- PostgreSQL
- AMap Web Service APIs

The backend is responsible for:

- Business entities and persistence
- Place normalization
- Reverse geocoding
- POI search
- Route planning
- Route segment caching
- Cross-platform data consistency

## 7. Map Capability Boundaries

### 7.1 Mobile SDK responsibilities

Use native AMap SDKs for:

- Device location
- Map rendering
- Interactive map gestures
- Marker rendering
- Polyline rendering
- Map selection interactions
- Route overlays
- Styled map presentation

### 7.2 Web map responsibilities

Use AMap JS API for:

- Route viewing
- Point and line display
- Editing support on large screens
- Admin and operational map review

### 7.3 Backend map service responsibilities

Use AMap Web Services for:

- POI lookup
- Reverse geocoding
- Route planning
- Standardized provider response transformation

Clients should not own the final truth of planned route geometry. Planned route results should be persisted as business data.

## 8. Data Model

The final product needs more than just lightweight point and line records. It should persist standardized geographic and route entities.

### 8.1 Place

A structured real place.

Fields:

- `id`
- `provider`
- `providerPlaceId`
- `name`
- `shortName`
- `formattedAddress`
- `province`
- `city`
- `district`
- `latitude`
- `longitude`
- `poiType`
- `category`
- `addressSnapshot`

### 8.2 Point

The smallest user-created unit.

Fields:

- `id`
- `ownerId`
- `title`
- `note`
- `mediaAssets`
- `capturedAt`
- `checkInAt`
- `latitude`
- `longitude`
- `placeId`
- `pointState`
- `addressSnapshot`

Notes:

- `sourceType` is intentionally omitted
- The core model should not carry analytics-style provenance unless clearly needed later

### 8.3 Line

The main content object.

Fields:

- `id`
- `ownerId`
- `title`
- `summary`
- `visibility`
- `status`
- `coverMediaId`
- `startedAt`
- `endedAt`
- `pointCount`
- `totalDistanceMeters`
- `totalDurationSeconds`
- `isCompleted`

Notes:

- A single `cityName` field is intentionally omitted because lines may span multiple cities
- If later needed for read performance, a derived region summary can be stored separately

### 8.4 LinePoint

The ordered membership layer between a line and a point.

Fields:

- `id`
- `lineId`
- `pointId`
- `sequence`
- `arrivalAt`
- `departureAt`
- `isLocked`

This separates a point's existence from its placement inside a specific line.

### 8.5 RouteSegment

The planned route result between two neighboring points in a line.

Fields:

- `id`
- `lineId`
- `fromPointId`
- `toPointId`
- `provider`
- `distanceMeters`
- `durationSeconds`
- `polyline`
- `strategy`
- `rawRoutePayload`
- `generatedAt`

Notes:

- `segmentMode` is intentionally omitted in version one
- The product should not force a per-segment transportation taxonomy before it is needed

## 9. Route Planning Rules

### 9.1 Segment-based planning

Route planning should happen between neighboring points, not only at the whole-line level. This allows local recalculation after point edits and makes caching practical.

### 9.2 Recalculation triggers

At minimum, route segments should be recalculated when:

- A point is inserted into a line
- The point order changes
- A point's location changes
- The user explicitly refreshes the route

### 9.3 Default planning strategy

Version one should not expose transportation mode selection as a primary user decision.

The default rule is:

- Choose the most reasonable display-oriented route automatically
- Prioritize a stable, believable route expression for replay and sharing
- Fall back gracefully when a route cannot be planned

### 9.4 Failure behavior

If a route segment fails to plan:

- The line remains editable and savable
- The failed segment falls back to a straight connecting line or dashed fallback expression
- The UI clearly shows that the segment is not backed by a planned route yet

TripIn is not a navigation app. The route's job is expressive geographic replay, not guaranteed legal-grade or turn-by-turn truth.

## 10. Social and Recommendation Layer

### 10.1 Home feed structure

The home feed should combine:

- Recommended routes
- Following routes

This is not a purely following-based feed and not a purely algorithmic anonymous feed. It is a mixed social discovery surface.

### 10.2 Social object

The line is the main shared object, not an isolated point.

Primary social interactions:

- View
- Like
- Save
- Comment
- Share

### 10.3 Recommendation system

Version one recommendation can begin with rule-based and content-based ranking:

- Recency
- Engagement
- Place similarity
- Creator relationship
- Basic user behavior signals

More advanced ranking can come later, but recommendation should already be treated as a real subsystem in the final product shape because the home feed is the app's default first screen.

## 11. Map Styling Direction

The desired map tone is lifestyle-oriented rather than pure navigation tooling.

Version one styling priorities:

1. Point and route expression
2. Overlay cards and motion
3. Base map customization

Practical approach:

- Use AMap custom base styles where possible
- Invest more heavily in custom markers, route polylines, selection states, cards, and map-driven content presentation

The product should avoid looking like a reskinned utility map.

## 12. Non-Goals For This Spec

This spec does not attempt to solve:

- Full trip planning workflows
- Manual per-segment travel mode editing
- Passive continuous background tracking as the default recording model
- Provider-agnostic map runtime in version one
- Multi-provider map orchestration in version one

## 13. Testing And Validation

### 13.1 Product validation scenarios

The minimum benchmark scenarios are:

- A user enters from the home feed, creates a draft point from a photo, confirms location on a map, and sends the point to inbox
- A user with an active line creates a new point and chooses whether to attach it or keep it in inbox
- A user edits a line on mobile and sees route recalculation
- A user edits a line on web and sees the same persisted results
- A user publishes a line and sees it surface in the community feed and detail page

### 13.2 Technical validation areas

Validation should cover:

- Native mobile map integration
- Web map editor behavior
- Provider response normalization
- Route segment recalculation correctness
- Cross-platform editing consistency
- Fallback behavior when map services fail

## 14. Implementation Implication

The previous point-to-line skeleton spec is no longer sufficient as the main implementation target because it treated map capability as secondary. This spec replaces it with a real-map product target.

The next implementation plan should therefore cover:

- Expo Prebuild and native map module integration
- Web map editor introduction
- Backend geographic service layer expansion
- Data model evolution toward places and route segments
- Feed and editing flow alignment with the new home-first experience
