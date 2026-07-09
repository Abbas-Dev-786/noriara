# Technical Architecture

## Platform

Daily Line uses:

- Reddit Devvit.
- Devvit Web.
- React for app screens and UI.
- Phaser for gameplay rendering and pointer input.
- TypeScript for client, server, and shared logic.
- Devvit server endpoints for trusted operations.
- Redis for scores, leaderboards, daily run records, replay metadata, streaks, and player stats.

## Repository Shape

Target structure:

```text
.
|-- devvit.json
|-- package.json
|-- src
|   |-- client
|   |   |-- App.tsx
|   |   |-- game
|   |   |   |-- DailyLineGame.ts
|   |   |   |-- scenes
|   |   |   |-- systems
|   |   |   |   |-- gesture
|   |   |   |   |-- locomotion
|   |   |   |   |-- collision
|   |   |   |   `-- replay
|   |   |   `-- rendering
|   |   |-- screens
|   |   |-- styles
|   |   `-- types
|   |-- server
|   |   |-- index.ts
|   |   |-- routes
|   |   |-- services
|   |   `-- validation
|   `-- shared
|       |-- seed
|       |-- puzzle
|       |-- gesture
|       |-- locomotion
|       |-- collision
|       |-- scoring
|       `-- replay
|-- docs
`-- plan
```

## Client Responsibilities

The client is responsible for:

- Rendering home, gameplay, results, leaderboard, and replay screens.
- Running Phaser gameplay.
- Capturing pointer gesture samples.
- Smoothing/resampling gestures.
- Starting living-line locomotion on release.
- Rendering the moving line body.
- Showing immediate target, success, and failure feedback.
- Playing local replay animations.
- Sending official run submissions to the server.
- Displaying server-returned rank, score, streak, and replay data.

The client is not trusted for final score authority.

## Server Responsibilities

The server is responsible for:

- Resolving user identity from Devvit request context.
- Returning today's daily seed.
- Creating or checking official daily run state.
- Validating submitted runs.
- Recomputing locomotion, collisions, solves, and score.
- Writing validated scores to Redis.
- Returning leaderboards.
- Returning replay data.
- Updating streaks and player stats.
- Running scheduled daily archival or cleanup tasks.

## Shared Logic

Shared TypeScript modules should contain deterministic logic used by both client and server.

Important shared modules:

- Seeded random number generator.
- Daily seed resolver.
- Target/hazard puzzle generator.
- Gesture smoothing/resampling.
- Living-line locomotion simulator.
- Full-body collision helpers.
- Boundary simulation.
- Score calculator.
- Replay serializer.

The server is authoritative, but shared logic prevents client/server behavior drift.

## Core Gameplay Systems

### Gesture Capture

Input:

- Pointer down.
- Pointer move.
- Pointer up.

Output:

- Raw point array.
- Smoothed/resampled point array.
- Gesture length.
- Release timestamp.

Rules:

- One gesture per attempt.
- Ignore multi-touch after first pointer lock.
- Minimum gesture length required.
- Collision begins only after release.

### Locomotion

The locomotion system converts the gesture into a repeated movement pattern.

Rules:

- Convert smoothed points to displacement vectors.
- Move the line head through those vectors at constant speed.
- Repeat the vector sequence indefinitely.
- Keep a head-position history.
- Render a trailing body whose arc length equals the original gesture length.
- Use the rendered body segments for collision.

### Collision

Collision checks the whole moving body.

Target:

- Any body segment intersecting a colored circle collects it.

Hazard:

- Any body segment intersecting a black circle fails the attempt.

Boundary:

- Top/bottom reflect vertical movement.
- Full horizontal escape with targets remaining fails the attempt.

## Data Model

### Daily Seed

```text
daily:{yyyy-mm-dd}:seed -> string
```

If no stored seed exists, derive one from the UTC date and app secret/configured salt.

### Leaderboard

```text
daily:{yyyy-mm-dd}:leaderboard -> Redis sorted set
member: userId
score: finalScore
```

Tie-breakers should be stored in:

```text
daily:{yyyy-mm-dd}:runs:{userId}
```

Fields:

- score.
- puzzlesSolved.
- submittedAt.
- totalRunMs.
- replayKey.
- validationStatus.

### Replay

```text
daily:{yyyy-mm-dd}:replay:{userId}
```

Replay payload:

- version.
- dailySeed.
- puzzleIds.
- gestureSamples.
- releaseTimestamps.
- solveEvents.
- failureEvents.
- finalScore.
- puzzlesSolved.

Replay storage must be capped. MVP should store current user's replay and top 10 replay candidates.

### Player Stats

```text
player:{userId}:stats
```

Fields:

- currentStreak.
- longestStreak.
- lastPlayedDate.
- bestScore.
- bestRank.
- totalRuns.
- totalPuzzlesSolved.

## API Routes

### GET /api/bootstrap

Returns:

- current user state.
- today's date.
- today's seed.
- whether the user has already submitted an official run.
- current streak.
- personal best summary.

### POST /api/run/start

Creates or confirms today's official run start.

Returns:

- runId.
- seed.
- serverStartTime.
- officialRunAllowed.

### POST /api/run/submit

Accepts:

- runId.
- dailyDate.
- gesture samples.
- release timestamps.
- solve/failure events.
- client summary.

Server validates and returns:

- accepted.
- finalScore.
- puzzlesSolved.
- rank.
- validation warnings if rejected.

### GET /api/leaderboard

Returns today's leaderboard page.

### GET /api/replay/:userId

Returns replay data only for allowed replay targets.

### GET /api/stats

Returns player stats.

## Puzzle Generation Architecture

Generator pipeline:

```text
daily seed
puzzle index
difficulty band
layout archetype selection
target placement
hazard placement
validation
playable puzzle
```

Phase 1 layout archetypes:

- Open Sweep.
- Thread the Hazard.
- Bounce Catch.
- Cluster Split.
- Escape Pressure.

These are not different puzzle mechanics. The objective is always to collect all colored circles and avoid black holes.

Later mechanics may include:

- Moving targets.
- Moving hazards.
- Wind fields.
- Gravity wells.
- Portals.
- Mirrors.

Future mechanics must preserve the living-line model.

## Validation Strategy

Validation happens at two levels.

### Generated Puzzle Validation

Before a generated puzzle is accepted:

- Targets and hazards must fit inside the safe play area.
- Targets must not overlap hazards.
- Visual radii must match collision radii.
- The first puzzle must be simple.
- Early puzzles must avoid unfair density.
- Layout must match target difficulty band.

### Submitted Run Validation

Before a score is accepted:

- User must be logged in.
- Daily date and seed must match server date.
- Run must not duplicate an existing official submission.
- Puzzle order must match deterministic generator output.
- Gesture timestamps must fit the run.
- Pointer movement speed must be physically plausible.
- Locomotion simulation must reproduce claimed solve/failure events.
- Score must be recomputed server-side.

## Rendering Strategy

Use Phaser for:

- Puzzle geometry.
- Pointer input.
- Gesture line rendering.
- Moving line locomotion.
- Target collection animations.
- Hazard failure animations.
- Replay playback.
- Lightweight camera pulse and screen shake.

Use React for:

- App shell.
- Home screen.
- Countdown overlays if simpler.
- Results screen.
- Leaderboard.
- Settings.
- Replay controls.

## Mobile-First Constraints

- Large playfield.
- No required keyboard input.
- No tiny gaps.
- No pixel-perfect paths.
- Gameplay works in portrait.
- Page scrolling disabled during drawing.
- Expanded mode requested for the actual run when supported.

## Testing Strategy

Minimum test coverage:

- Seed generation is deterministic.
- Puzzle generation is deterministic.
- Gesture smoothing/resampling is deterministic.
- Locomotion simulation is deterministic.
- Boundary reflection is deterministic.
- Full-body collision detects targets and hazards.
- Score calculation is deterministic.
- Replay serialization/deserialization works.
- Server rejects duplicate official submissions.
- Server rejects impossible submitted runs.

Manual validation:

- Run locally.
- Play on desktop viewport.
- Play on mobile viewport.
- Confirm drawing feels immediate.
- Confirm release-to-locomotion feels instant.
- Confirm top/bottom bounce is understandable.
- Confirm full-body collision is fair.
- Confirm no frame drops during drawing or locomotion.
- Confirm leaderboard updates after accepted submission.
