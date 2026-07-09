# Phase 2 - Competitive Loop

## Goal

Turn the local MVP into a Reddit daily competition.

This phase ends when logged-in users can submit one official validated score per UTC day and appear on a daily leaderboard.

## Why This Phase Exists

The hackathon retention category depends on the daily competitive loop. Phase 2 adds the systems that make the game Reddit-native and replayable day after day.

## Scope

### Included

- Server-backed daily seed.
- Official run start endpoint.
- Official run submit endpoint.
- User identity check.
- One official submission per user per day.
- Server-side score recomputation.
- Basic anti-cheat validation.
- Redis-backed daily leaderboard.
- Results screen with rank.
- Leaderboard screen.
- Duplicate submission handling.

### Not Included

- Full replay viewer.
- Streak rewards.
- Weekly events.
- Community puzzles.
- Cosmetics.
- Advanced anti-cheat.

## Official Run Rules

Default rule:

Each logged-in Reddit user gets one official leaderboard submission per UTC day.

Practice can be available outside official scoring, but practice scores do not affect the leaderboard.

## Server Flow

```text
Client calls /api/bootstrap
Server returns user state and today's seed
Client calls /api/run/start
Server creates runId
Player completes run
Client submits gesture/replay summary
Server validates run
Server recomputes score
Server writes leaderboard entry
Server returns result and rank
```

## API Implementation

### GET /api/bootstrap

Returns:

- user logged-in state.
- today's UTC date.
- daily seed.
- hasSubmittedToday.
- user's current daily score if submitted.
- top leaderboard preview.

### POST /api/run/start

Rules:

- User must be logged in for official run.
- If already submitted, official run is denied.
- Server returns a `runId` and seed.

### POST /api/run/submit

Rules:

- User must be logged in.
- Run must exist.
- Run must match today's date.
- User must not already have an accepted submission.
- Server validates and scores.

### GET /api/leaderboard

Returns:

- top scores.
- current user's rank if available.
- score.
- puzzles solved.

## Anti-Cheat MVP

Server validation should check:

- Daily seed matches server date.
- Puzzle sequence matches deterministic generator.
- Submitted puzzle solves are in valid order.
- Claimed score equals server recomputed score.
- Submitted timestamps fit inside 30-second run.
- Submitted gestures reproduce each claimed solve through deterministic locomotion.
- Movement speed is within generous plausible bounds.
- Duplicate official submission is rejected.

This does not need to stop every possible attack in Phase 2, but it must prevent naive score spoofing.

## Leaderboard Sorting

Primary:

- Highest score.

Tie-breakers:

1. More puzzles solved.
2. Faster final solve timestamp.
3. Earlier submission time.

## Redis Data

Use:

```text
daily:{date}:leaderboard
daily:{date}:runs:{userId}
officialRun:{date}:{userId}
```

## UI Changes

### Home

Shows:

- Today's Challenge.
- Play Official Run if eligible.
- Practice if already submitted.
- Leaderboard preview.

### Results

Shows:

- Accepted or rejected status.
- Final score.
- Daily rank.
- Puzzles solved.
- Leaderboard button.

### Leaderboard

Shows:

- Rank.
- Reddit username or display name.
- Score.
- Puzzles solved.
- Highlight current user.

## Implementation Tasks

### 1. Server Seed Authority

- Move daily seed resolution to server.
- Client receives seed from `/api/bootstrap`.
- Shared generator remains deterministic.

### 2. Official Run Lifecycle

- Add run start route.
- Add run token/id.
- Store run start time.
- Prevent duplicate official submissions.

### 3. Submission Payload

Payload should include:

- runId.
- date.
- gesture point samples.
- release timestamps.
- solve events.
- failure events.
- client score summary.

### 4. Server Validation

- Recreate puzzle sequence.
- Simulate gesture locomotion.
- Validate target collection, hazard collision, and boundary outcomes.
- Recompute score.
- Accept or reject.

### 5. Leaderboard Storage

- Store accepted score.
- Store run metadata.
- Query top scores.
- Query user's rank.

### 6. UI Integration

- Add official/practice mode distinction.
- Add submission loading state.
- Add rejection state.
- Add leaderboard screen.

## Milestone Build

At the end of Phase 2, a logged-in user can:

```text
Open today's challenge
Start official run
Finish 30-second game
Submit score
See daily rank
Open leaderboard
Try again only as practice
```

## Validation Checklist

- [ ] User can start an official run.
- [ ] User can submit a completed run.
- [ ] Server recomputes score.
- [ ] Score appears on leaderboard.
- [ ] User rank appears on results screen.
- [ ] Duplicate official submission is rejected.
- [ ] Practice mode does not change leaderboard.
- [ ] Invalid score payload is rejected.
- [ ] Same daily seed is used client and server.

## Acceptance Criteria

Phase 2 is complete when the game has a working daily competition loop with server-validated scores.

## Risks

### Validation Is Too Strict

Mitigation:

Use generous tolerances for collision and timing. Prioritize rejecting obvious cheating over punishing legitimate players.

### Leaderboard Feels Empty During Testing

Mitigation:

Add local/dev seed users or a debug fixture route only in development.
