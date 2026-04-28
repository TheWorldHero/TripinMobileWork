# TripIn Point-To-Line Design

Date: 2026-04-16
Status: Draft approved in conversation, written for review

## 1. Summary

TripIn's next phase should focus on becoming a point-driven life trajectory recording tool instead of a community-first travel product or a trip-planning assistant.

The core product loop is:

1. The user creates lightweight points from real life moments.
2. The system groups points into candidate lines.
3. The user edits a line into a complete, replayable route.
4. The finished line is primarily used for private review, with sharing as a secondary action.

This direction prioritizes daily life trajectories first, while still supporting both live capture and post-hoc editing for travel scenarios.

## 2. Product Positioning

### Primary direction

- Recording tool first
- Community second
- Trip planning not in the near-term core scope

### Primary scenario

- Daily life trajectories are the default scenario
- Live capture during the day is supported
- Post-hoc editing is supported on top of live capture

### Product thesis

TripIn should help users turn scattered visual memories into a structured line that is worth revisiting later.

This means:

- The basic unit of creation is the point
- The core content unit is the line
- The product should minimize friction when creating a point
- The product should make line assembly and editing the center of value

## 3. Design Principles

### 3.1 Point first, line centered

Points are the collection unit. Lines are the finished content unit. The product should never collapse into a plain photo album where the line is only a weak byproduct.

### 3.2 Active lightweight recording

Version one should not rely on passive background location tracking. Users actively create points. The system assists with time, place, grouping, and editing.

### 3.3 Private review before public sharing

The first job of a finished line is to be useful for the creator. Sharing to friends or publishing to a feed should remain available, but not define the first version of the product.

### 3.4 Creation must stay in context

When a user is editing a line, they must be able to create a new point without leaving that editing context.

### 3.5 Explainable automation

Automatic candidate lines should be helpful but not opaque. The system should propose an editable starting point, not force users into system guesses they cannot easily correct.

## 4. Core Object Model

### 4.1 Point

A point is the smallest unit the user creates.

Required for creation:

- One image

Optional at creation time:

- Time
- Place
- One-line note
- Tags

Required before a point can reliably participate in a line:

- Image
- Time
- Place

Intent:

- Fast to create in the moment
- Can be created live or retroactively
- Can be completed later

### 4.2 Candidate line

A candidate line is a system-generated grouping of points that may belong to the same outing, walk, day fragment, or trip segment.

Properties:

- Generated from time and place patterns
- Editable by the user
- Not a finished work

Available actions:

- Split line
- Merge lines
- Remove a point
- Pull in an unassigned point
- Rename
- Reorder points

### 4.3 Finished line

A finished line is the main content object in the product.

Minimum expected contents:

- Title
- Ordered point sequence
- Time range
- Spatial route

Primary jobs:

- Private review and replay
- Save as a personal record
- Optional later sharing

## 5. User Flows

### 5.1 Live quick check-in

Example:

- The user arrives at the Great Wall
- Takes a photo
- Opens TripIn and creates a point
- The app auto-fills current time and current place when possible

Goal:

- Complete this in a few seconds
- Do not require line creation in that moment
- Do not require long text entry

### 5.2 Post-hoc point creation

Example:

- The user went to the Forbidden City and took several photos
- They did not create points in the app on site
- Later they create a point by selecting photos and filling time and place

Goal:

- Allow backfilling of missed moments
- Keep the point model consistent whether created live or later

### 5.3 Candidate line generation

After enough points exist, the system groups them into candidate lines.

Example:

- Great Wall point plus Forbidden City point become a same-day Beijing candidate line

Goal:

- Give the user a head start
- Avoid requiring fully manual assembly from scratch

### 5.4 In-line editing and completion

When the user edits a line, they should be able to:

- Add a new point inside the editor
- Pull an existing point in from the inbox
- Reorder points
- Fill missing time and place
- Remove irrelevant points
- Rename the line
- Save the result as a finished line

This is a hard requirement for version one because line editing is not just cleanup. It is part of the core creation flow.

## 6. Information Architecture

Version one should revolve around three main screens.

### 6.1 Home

Purpose:

- Resume work
- Start a new point quickly
- Continue unfinished organization

Should prioritize:

- Quick check-in entry
- Continue editing current line
- Recent candidate lines
- Alerts for points that still need time or place

Home should not act like a community-first feed in version one.

### 6.2 Inbox

Purpose:

- Hold all unfinished material between point capture and line completion

Contains:

- Unassigned points
- Candidate lines
- Points missing time
- Points missing place

Must support:

- Fill missing metadata
- Move a point into a line
- Create a new line from selected points
- Delete invalid points
- Accept and adjust candidate lines

The inbox is a working surface for half-finished content, not a passive archive.

### 6.3 Line editor

Purpose:

- Turn points into a finished line

Must support:

- Create a point inside the line
- Pull a point in from the inbox
- Reorder points
- Update line title
- Fill photo, time, place, and note details
- Split or merge lines
- Remove irrelevant points

Product rule:

- A user editing a line must never be forced to leave the current context just to add a point.

## 7. MVP Scope

The version one goal is to validate whether users can reliably move from points to completed lines they want to revisit.

### 7.1 In scope

#### A. Fast point creation

- Live quick check-in
- Post-hoc point creation
- Minimum point creation with one image
- Auto-suggest current time and current place when available

#### B. Inbox organization

- List unassigned points
- Show candidate lines
- Identify points missing time or place
- Move points into a line or create a new line

#### C. Candidate line generation

- Basic grouping based on time and place
- Editable output instead of fully automatic publishing

#### D. Line editor

- Add point inside the editor
- Pull point from inbox
- Reorder points
- Edit line title
- Fill missing time and place
- Remove wrong points
- Save a completed line

#### E. Review screen

- Show line title
- Show time range
- Show route map
- Show ordered points
- Show each point's image, place, time, and note

### 7.2 Explicitly out of scope

- Community growth mechanics
- Follow graph
- Recommendation algorithms
- Rich public interaction systems
- Travel planning and guide features
- Passive background tracking
- AI-written captions or narratives
- Multi-user collaborative line creation

## 8. State Model

### 8.1 Point states

Recommended point states:

- Recorded
- Needs completion
- Ready for line

Interpretation:

- Recorded: the point exists, but may only have an image or partial metadata
- Needs completion: the point is missing time or place
- Ready for line: the point has image, time, and place

Rule:

- A point can be created before it is fully complete
- A point should only be considered reliable for line assembly after time and place are present

### 8.2 Line states

Recommended line states:

- Candidate
- Editing
- Completed

Interpretation:

- Candidate: system grouped it automatically
- Editing: the user has started to shape it manually
- Completed: it satisfies the product's review requirements

Rule:

- Users may begin editing before every point is fully complete
- A line should only be marked completed when all required line contents are present

## 9. Candidate Line Rules

Version one should use simple, explainable grouping rules.

Suggested grouping logic:

- Group primarily by time closeness
- Use location change as a secondary split signal
- Daily life trajectories should usually default toward same-day groupings
- Large time gaps or obvious place jumps should split candidate lines

The product should optimize for editability, not perfect automation.

Because of that, every candidate line must support:

- Split
- Merge
- Remove point
- Pull in unassigned point

## 10. In-Line Point Creation Rules

This is a core requirement derived from the approved scenario.

When a user is editing a line, new point creation should feel lighter than a full standalone flow.

The editor should help by:

- Prefilling likely date context from the line
- Suggesting time based on nearby points when inserted between them
- Suggesting current place, recent places, or searched places
- Keeping the user inside the line editor after save

The point of in-line creation is to let users complete the line while the structure is visible in front of them.

## 11. Exception Handling

### 11.1 Missing place

- The point can still be saved
- The point should appear in a needs-place list
- The user can fill place via current location, recent place, or place search

### 11.2 Missing time

- Prefer photo capture time if available
- Otherwise ask for manual input later
- The point should appear in a needs-time list

### 11.3 Duplicate photo or duplicate point

- Warn the user that the item may already exist
- Offer merge rather than destructive deletion by default

### 11.4 Wrong candidate line

- Never lock the user into the system's grouping
- Always allow split and merge

### 11.5 Wrong order

- Manual reorder must override any system ordering

## 12. Success Metrics

Version one should measure whether the point-to-line workflow actually works.

Primary metrics:

- Point to completed line conversion rate
- Seven-day finished line revisit rate

Supporting signals:

- Share rate after line completion
- Candidate line acceptance rate
- Percentage of points that remain incomplete

## 13. Testing Focus

Testing should center on point-to-line reliability instead of community behavior.

### 13.1 Rule tests

- Point state transitions
- Line completion criteria
- Basic candidate grouping behavior

### 13.2 Flow tests

- Live check-in
- Post-hoc point creation
- In-line point creation during line editing

### 13.3 Scenario test

Use this approved benchmark scenario:

- The user creates a Great Wall point live with auto-filled time and place
- Later they create a Forbidden City point after the trip
- During line editing, they add another point directly inside the editor
- They reorder and complete the Beijing one-day line

The product should support this entire scenario without forcing the user into a separate disconnected creation flow.

## 14. Resulting Product Definition

TripIn version one is a point-driven, line-centered life trajectory recorder.

The user captures moments as points with minimal friction. The system proposes candidate lines. The user edits those into complete lines for personal review first, then optional sharing.

This definition should guide the next implementation plan.
