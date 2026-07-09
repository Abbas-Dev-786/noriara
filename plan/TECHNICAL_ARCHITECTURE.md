# Technical Architecture

## Platform

Daily Line will use:

- Reddit Devvit.
- Devvit Web.
- React for app screens and UI.
- Phaser 3 for gameplay rendering and pointer input.
- TypeScript for client and server code.
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
|       |-- puzzle
|       |-- scoring
|       |-- replay
|       `-- seed
|-- docs
`-- plan
```

## Client Responsibilities

The client is responsible for:

- Rendering the home, gameplay, results, leaderboard, and replay screens.
- Running Phaser gameplay.
- Capturing pointer path samples.
- Showing immediate success and failure feedback.
- Playing local replay animations.
- Sending run submissions to the server.
- Displaying server-returned rank, score, streak, and replay data.

The client is not trusted for final score authority.

## Server Responsibilities

The server is responsible for:

- Resolving user identity from Devvit request context.
- Returning today's daily seed.
- Creating or checking official daily run state.
- Validating submitted runs.
- Recomputing score.
- Writing validated scores to Redis.
- Returning leaderboards.
- Returning replay data.
- Updating streaks and player stats.
- Running scheduled daily archival or cleanup tasks.

## Shared Logic

Puzzle generation and scoring should live in shared TypeScript modules so client and server use the same deterministic rules.

Important shared modules:

- Seeded random number generator.
- Daily seed resolver.
- Puzzle generator.
- Puzzle validator.
- Collision and geometry helpers.
- Score calculator.
- Replay serializer.

The server should always be the authority, but shared logic avoids duplicated implementations.

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

Tie-breakers should be stored in a separate hash:

```text
daily:{yyyy-mm-dd}:runs:{userId}
```

Fields:

- score
- puzzlesSolved
- submittedAt
- totalRunMs
- replayKey
- validationStatus

### Replay

```text
daily:{yyyy-mm-dd}:replay:{userId}
```

Replay payload:

- version
- dailySeed
- puzzleIds
- pathSamples
- solveEvents
- finalScore
- puzzlesSolved

Replay storage must be capped. MVP should store current user's replay and top 10 replay candidates.

### Player Stats

```text
player:{userId}:stats
```

Fields:

- currentStreak
- longestStreak
- lastPlayedDate
- bestScore
- bestRank
- totalRuns
- totalPuzzlesSolved

## API Routes

### GET /api/bootstrap

Returns:

- current user state
- today's date
- today's seed
- whether the user has already submitted an official run
- current streak
- personal best summary

### POST /api/run/start

Creates or confirms today's run start.

Returns:

- runId
- seed
- serverStartTime
- officialRunAllowed

### POST /api/run/submit

Accepts:

- runId
- dailyDate
- replay/path samples
- client summary

Server validates and returns:

- accepted
- finalScore
- puzzlesSolved
- rank
- validation warnings if rejected

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
difficulty index
template selection
layout generation
validation
playable puzzle
```

Phase 1 templates:

- Connect.
- Collect.
- Avoid.

Later templates:

- Cover.
- Efficiency.
- Moving obstacles.
- Switches.
- Teleporters.
- Seasonal mechanics.

## Validation Strategy

Validation happens at two levels.

### Generated Puzzle Validation

Before a generated puzzle is accepted:

- Must fit inside safe play area.
- Must have a valid solution.
- Must avoid impossible geometry.
- Must meet minimum touch target sizes.
- Must match target difficulty band.

### Submitted Run Validation

Before a score is accepted:

- User must be logged in.
- Daily date and seed must match server date.
- Run must not duplicate an existing official submission.
- Puzzle order must match deterministic generator output.
- Path must solve each submitted puzzle.
- Path timestamps must be plausible.
- Movement speed must be physically plausible for touch/mouse input.
- Score must be recomputed server-side.

## Rendering Strategy

Use Phaser for:

- Puzzle geometry.
- Pointer input.
- Line rendering.
- Success/failure animations.
- Replay drawing.
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

- Large touch targets.
- No required keyboard input.
- No tiny gaps.
- No pixel-perfect paths.
- Gameplay works in portrait.
- Expanded mode should be requested for the actual run when supported.

## Testing Strategy

Minimum test coverage:

- Seed generation is deterministic.
- Puzzle generation is deterministic.
- Generated puzzles are valid.
- Score calculation is deterministic.
- Replay serialization/deserialization works.
- Server rejects duplicate official submissions.
- Server rejects impossible submitted runs.

Manual validation:

- Run locally.
- Play on desktop viewport.
- Play on mobile viewport.
- Confirm no frame drops during drawing.
- Confirm leaderboard updates after accepted submission.
