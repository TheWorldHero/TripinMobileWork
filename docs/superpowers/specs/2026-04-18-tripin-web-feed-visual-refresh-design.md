# TripIn Web Feed Visual Refresh Design

Date: 2026-04-18
Status: Draft approved in conversation, written for review
Related:
- `docs/superpowers/specs/2026-04-17-tripin-real-map-product-design.md`
- `docs/superpowers/plans/2026-04-17-tripin-real-map-product-implementation.md`

## 1. Summary

This spec defines the first visual refresh for the TripIn web home feed.

The goal is to move the current web feed away from:

- yellow-brown editorial styling
- visible card shells
- rounded modules
- extra utility chrome

and toward a cleaner community-first feed that feels closer to a real social product.

The feed should still preserve TripIn's distinguishing content model:

- every post is a route post, not a generic photo post
- a route map must still appear inside the feed item
- the feed remains visually light, white, and easy to scroll

## 2. Design Goals

### 2.1 Primary goals

- White should be the dominant page color.
- Feed posts should not read as boxed cards.
- A route map must remain visible in every post.
- Default media framing should assume vertically shot mobile photos.
- The post should feel lighter and shorter than the current version.

### 2.2 Secondary goals

- The feed should feel closer to Instagram than to a dashboard.
- The visual hierarchy should rely on spacing, grayscale contrast, and scale rather than borders.
- The route map should feel integrated into the post instead of looking like a separate heavy widget.

### 2.3 Non-goals

- Do not introduce a right-top overflow menu in this version.
- Do not expose point lists or point-list entry chips in the feed.
- Do not redesign route detail or line editor in this spec.

## 3. Visual Direction

### 3.1 Core aesthetic

The feed should look like a modern white social stream:

- white canvas
- black or near-black primary text
- neutral gray metadata
- minimal chrome

This refresh should not use:

- vintage yellow-brown paper styling
- decorative frames
- visible card shadows
- ornamental borders

### 3.2 Shape language

Global rule:

- no rounded cards
- no rounded content blocks
- no thin separator lines used as layout scaffolding

One explicit exception:

- the avatar stays circular

### 3.3 Hierarchy method

Posts should be separated using:

- vertical whitespace
- media scale
- typography
- icon rhythm

not by boxes or borders.

## 4. Feed Structure

Each post should render in this order:

1. Header
2. Portrait media
3. Compact route map
4. Current point address
5. Title and short copy
6. Like and comment actions

## 5. Post Anatomy

### 5.1 Header

The header contains:

- circular avatar
- author name
- city or place context
- publish time

The header does not contain:

- overflow menu
- extra badges
- secondary utility controls

### 5.2 Media block

The media block should default to a portrait mobile-photo ratio.

Recommended default:

- `aspect-ratio: 4 / 5`

This ratio should be the default presentation even when sample data is synthetic.

The media block should be:

- edge-clean
- not rounded
- not framed by visible border lines

### 5.3 Route map block

The route map is required in every feed post.

It should appear directly below the media block and should be visually compressed so it does not dominate the post.

Recommended characteristics:

- short vertical height
- flatter than the media area
- no rounded corners
- no outer border
- no decorative grid or line scaffolding used as a frame

The route line itself remains visible and is the primary content inside the map block.

The map should communicate:

- there is a real route
- the route belongs to this post
- the route is a supporting layer, not the main visual

### 5.4 Current point address

The current point address must not sit on top of the route map.

It should appear:

- below the route map
- left aligned
- in small gray text

This text acts as lightweight geographic context, not as a badge or chip.

### 5.5 Copy block

Below the address:

- title
- optional short summary

The copy should stay compact and should not create a large text wall in feed.

### 5.6 Action block

The bottom action row should contain only:

- like icon
- comment icon

This row should read as a standard social interaction area.

It should not include:

- save in this version
- share in this version
- menu in this version
- point-list entry

## 6. What Must Be Removed From The Current Feed

The refresh must remove these current patterns from the web feed:

- yellow-brown background direction
- post cards with obvious shells
- rounded post modules
- visible border-based segmentation
- point list panels inside the feed
- point list shortcut rows
- right-top menu label or placeholder

## 7. Layout Rules

### 7.1 Feed column

The feed should use a centered single-column stream.

The layout should feel narrow enough to read like a social feed instead of a landing page or dashboard.

### 7.2 Post spacing

Posts should be separated by vertical gaps rather than lines.

Recommended behavior:

- one post flows into the next
- spacing is enough to separate content rhythmically
- the page should not feel segmented into independent cards

### 7.3 Post height control

A single feed post should fit comfortably within a normal desktop viewport without forcing the route map and actions far below the fold.

This means:

- portrait media is acceptable
- the route map must stay short
- copy must stay compact
- no extra panel should be inserted between route map and actions

## 8. Interaction Rules

In feed:

- clicking media, route map, or text should still lead into route detail
- like and comment remain visible as the only explicit action icons
- the address is informative only

The feed should feel consumable first and explorable second.

## 9. Implementation Scope

This refresh applies to the web home feed surface and its immediate post-rendering components:

- `apps/web/app/page.tsx`
- `apps/web/src/components/HomeFeed.tsx`
- `apps/web/src/components/home-feed/*`
- `apps/web/app/globals.css`

This spec does not require backend API changes.

## 10. Acceptance Checklist

The refresh is correct when all of the following are true:

- The page is primarily white.
- The feed no longer looks like stacked cards.
- The avatar remains circular.
- Other modules do not use rounded corners.
- Posts do not rely on thin lines or borders for separation.
- Every post still contains a route map.
- The route map is visually shorter than the media block.
- The route map address is below the map, left aligned, and gray.
- The media block defaults to portrait mobile framing.
- The feed post no longer contains a point-list block or point-list entry.
- The post no longer contains a top-right menu.
- The bottom action row shows only like and comment.
