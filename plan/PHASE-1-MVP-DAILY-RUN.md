# Phase 1 - MVP Daily Run

## Goal

Build the first playable version of Daily Line.

This phase ends when a player can complete a full 30-second local daily run with deterministic puzzles, scoring, and a results screen.

## Why This Phase Exists

The core game must be fun before leaderboards, streaks, and replays matter.

Phase 1 proves:

- Drawing feels good.
- The puzzle mechanic is understandable.
- A 30-second run has tension.
- Puzzle progression works.
- The score loop is satisfying.

## Scope

### Included

- 30-second run.
- Countdown.
- One continuous line drawing.
- Three puzzle types:
  - Connect.
  - Collect.
  - Avoid.
- Deterministic daily seed.
- Deterministic puzzle sequence.
- Basic difficulty progression.
- Local scoring.
- Combo counter.
- Success and failure feedback.
- Results screen.
- Basic mobile layout.

### Not Included

- Server score submission.
- Daily leaderboard.
- Persistent streaks.
- Replay storage.
- Full anti-cheat.
- Community puzzles.
- Seasonal mechanics.
- Moving obstacles.

## Gameplay Rules

### Start

- Player taps Play.
- Countdown appears: 3, 2, 1, GO.
- 30-second timer starts.

### Drawing

- Player draws one continuous line.
- Releasing the pointer evaluates the attempt.
- If solved, next puzzle appears immediately.
- If failed, the current puzzle resets quickly.

### Timer

- Timer is always visible.
- Timer cannot pause.
- When time reaches zero, gameplay freezes and results appear.

### Scoring

Initial MVP formula:

```text
score = puzzleBaseScore + speedBonus + comboBonus
```

Suggested starting values:

- Easy puzzle: 100.
- Medium puzzle: 200.
- Hard puzzle: 350.
- Speed bonus: 0-50.
- Combo bonus: 10 per active combo level.

## Puzzle Types

### Connect

Goal:

Draw from start point to goal point without hitting obstacles.

Validation:

- Path starts within start radius.
- Path ends within goal radius.
- Path does not collide with walls or hazards.

### Collect

Goal:

Touch all checkpoints in one continuous line.

Validation:

- Path starts within start radius.
- All checkpoints are touched.
- Optional goal must be reached after checkpoints.
- Path does not collide with hazards.

### Avoid

Goal:

Reach the goal while avoiding walls or hazard shapes.

Validation:

- Path starts within start radius.
- Path reaches goal.
- Path never intersects hazard geometry.

## Generator Rules

The Phase 1 generator should be conservative.

Rules:

- Use seeded randomness.
- Keep all geometry inside safe play bounds.
- Avoid tiny gaps.
- Maintain generous hit radii.
- Generate only static puzzles.
- Reject layouts that fail basic validation.

## Difficulty Progression

Suggested progression:

| Puzzle Index | Difficulty | Allowed Types |
| --- | --- | --- |
| 1 | Tutorial | Connect |
| 2 | Very Easy | Connect |
| 3 | Easy | Connect, Collect |
| 4 | Easy+ | Connect, Collect, Avoid |
| 5 | Medium | Collect, Avoid |
| 6 | Medium+ | Collect, Avoid |
| 7+ | Hard | Connect, Collect, Avoid |

Difficulty should increase through:

- More obstacles.
- More checkpoints.
- Longer route planning.
- More decision points.

Difficulty should not increase through:

- Tiny hitboxes.
- Pixel-perfect gaps.
- Invisible rules.

## User Interface

### Home

Shows:

- Game title.
- Today's Challenge.
- Play button.
- Placeholder leaderboard button disabled or marked as coming later.

### Gameplay

Shows only:

- Timer.
- Score.
- Puzzle.
- Combo.

### Results

Shows:

- Final score.
- Puzzles solved.
- Highest combo.
- Best local score for current device.
- Play practice again button.

## Implementation Tasks

### 1. Run State Machine

States:

- home.
- countdown.
- playing.
- resolvingAttempt.
- finished.
- results.

### 2. Input System

- Capture pointer down, move, and up.
- Store path samples.
- Smooth rendered line.
- Prevent multi-touch confusion.
- Reset line after solve or fail.

### 3. Puzzle Model

Define shared puzzle types:

- `Puzzle`.
- `PuzzleType`.
- `Point`.
- `CircleGoal`.
- `Obstacle`.
- `Checkpoint`.

### 4. Geometry Helpers

Implement:

- Distance point to point.
- Distance point to segment.
- Segment/circle collision.
- Segment/rectangle collision.
- Path hits circle.
- Path hits obstacle.

### 5. Puzzle Generator

- Generate deterministic puzzle from seed and puzzle index.
- Generate Connect puzzles first.
- Add Collect.
- Add Avoid.
- Add validation/retry loop.

### 6. Scoring

- Calculate base score.
- Calculate speed bonus.
- Calculate combo bonus.
- Track puzzles solved.
- Track highest combo.

### 7. Feedback

- Success flash.
- Score popup.
- Combo pulse.
- Failure shake.
- Quick reset.
- Time-up transition.

### 8. Results Screen

- Show local run summary.
- Allow practice replay of the same local run if feasible.
- Allow return home.

## Milestone Build

At the end of Phase 1, a user can:

```text
Open app
Tap Play
Wait for countdown
Draw lines to solve puzzles
Play for 30 seconds
See score and puzzles solved
Play again locally
```

## Validation Checklist

- [ ] First-time player can understand the first puzzle without instructions.
- [ ] Drawing appears immediately under pointer/finger.
- [ ] A full 30-second run completes.
- [ ] At least three puzzle types can appear.
- [ ] Same UTC date generates the same puzzle sequence.
- [ ] Scoring increases when puzzles are solved.
- [ ] Combo increases on consecutive solves.
- [ ] Failure resets current puzzle without ending the run.
- [ ] Results screen appears when timer ends.
- [ ] Mobile viewport is playable.

## Acceptance Criteria

Phase 1 is complete when the local game loop is fun enough to replay without leaderboard support.

## Risks

### Puzzle Feel Is Too Abstract

Mitigation:

Make start, goal, checkpoints, and hazards visually distinct. Use animation and shape language, not text instructions.

### Drawing Feels Laggy

Mitigation:

Keep Phaser scene simple. Avoid React state updates during pointer movement.

### Puzzles Are Too Easy or Too Hard

Mitigation:

Start with hand-tuned generator parameters and add deterministic seed test cases.

