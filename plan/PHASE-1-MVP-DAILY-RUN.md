# Phase 1 - MVP Daily Run

## Goal

Build the first playable version of Daily Line.

This phase ends when a player can complete a full 30-second local run using the real living-gesture mechanic: draw one line, release it, watch it repeat, collect colored circles, avoid black holes.

## Why This Phase Exists

The core mechanic must feel magical before leaderboards, streaks, and replays matter.

Phase 1 proves:

- Drawing feels good.
- Release makes the line come alive.
- The repeated movement is understandable.
- Full-body collision feels fair.
- Target collection is satisfying.
- Failure is readable and fast.
- A 30-second run has tension.

## Scope

### Included

- 30-second run.
- Countdown.
- One continuous gesture capture.
- Gesture smoothing/resampling.
- Release-triggered locomotion.
- Repeating movement pattern.
- Constant-length moving line body.
- Colored circle targets.
- Black circle hazards.
- Full-body collision.
- Top/bottom bounce boundaries.
- Left/right escape failure.
- Deterministic daily seed.
- Deterministic target/hazard puzzle sequence.
- Basic difficulty progression.
- Local scoring.
- Combo counter.
- Success and failure feedback.
- Results screen.
- Basic mobile layout.

### Not Included

- Start-to-goal path puzzles.
- Connect templates.
- Cover templates.
- Efficiency or shortest-path objectives.
- Switches.
- Teleporters.
- Walls.
- Moving obstacles.
- Server score submission.
- Daily leaderboard.
- Persistent streaks.
- Replay storage.
- Full anti-cheat.
- Community layouts.
- Seasonal mechanics.

## Gameplay Rules

### Start

- Player taps Play.
- Countdown appears: 3, 2, 1, GO.
- 30-second timer starts.
- The first target/hazard board appears.

### Drawing

- Player draws one continuous gesture.
- The line appears immediately under the pointer.
- The game records an ordered point array.
- The line is smoothed or resampled for stable rendering and locomotion.
- Collision with targets and hazards does not apply during drawing.

### Release

- Releasing the pointer ends drawing.
- The gesture becomes a moving line.
- The original gesture length becomes the line body's permanent length for that attempt.
- The player cannot change the gesture after release.

### Locomotion

- The line head repeats the captured gesture's displacement sequence indefinitely.
- The repeated copies snap end-to-start.
- The body keeps the original gesture length.
- The tail follows the exact path traveled by the head.
- The line moves at a constant speed.

### Targets

- Colored circles are objectives.
- Any part of the moving line touching a target collects it.
- A collected target disappears with a soft pop or fade.
- Collecting the final target succeeds the puzzle.

### Hazards

- Black circles are hazards.
- Any part of the moving line touching a hazard fails the attempt.
- Failure should show a clear black-hole or collapse effect.

### Boundaries

- Top and bottom boundaries reflect the moving line's vertical trajectory.
- Left and right boundaries are exits.
- If the whole line leaves left or right while targets remain, the attempt fails.

### Timer

- Timer is always visible.
- Timer cannot pause.
- Timer does not reset on failure.
- When time reaches zero, gameplay freezes and results appear.

## Scoring

Initial MVP formula:

```text
score = puzzleBaseScore + speedBonus + comboBonus
```

Suggested starting values:

- Tutorial puzzle: 50.
- Easy puzzle: 100.
- Medium puzzle: 200.
- Hard puzzle: 350.
- Speed bonus: 0-50.
- Combo bonus: 10 per active combo level.

Combo rules:

- Solve puzzle: combo increases.
- Fail attempt: combo resets.
- Timer end: final score is shown.

## Puzzle Grammar

Phase 1 has one canonical puzzle grammar:

```text
Targets + Hazards + Boundaries + Living Gesture Line
```

Objective:

```text
Collect all colored circles without touching black holes.
```

There are no start nodes, goal nodes, checkpoints, walls, or separate path objectives in Phase 1.

## Generator Rules

The Phase 1 generator should be conservative.

Rules:

- Use seeded randomness.
- Generate target circle positions.
- Generate hazard circle positions.
- Keep all geometry inside safe play bounds.
- Keep visual and collision radii aligned.
- Avoid targets overlapping hazards.
- Avoid tiny gaps.
- Maintain generous hit radii.
- Generate only static target/hazard boards.
- Reject layouts that fail basic validation.

## Layout Archetypes

These are layout patterns, not separate puzzle types.

### Open Sweep

Targets are placed in open space with no hazards.

Purpose:

- Teach collection and repeated movement.

### Thread the Hazard

Targets are near one or more black holes.

Purpose:

- Teach that the whole body must avoid hazards.

### Bounce Catch

Targets reward using top/bottom bounce.

Purpose:

- Teach boundary reflection.

### Cluster Split

Targets appear in separate clusters.

Purpose:

- Encourage gestures that repeat across multiple areas.

### Escape Pressure

Targets are placed so a line may leave horizontally before solving.

Purpose:

- Teach that horizontal escape fails unsolved attempts.

## Difficulty Progression

Suggested progression:

| Puzzle Index | Difficulty | Layout |
| --- | --- | --- |
| 1 | Tutorial | 1 target, no hazard |
| 2 | Very Easy | 2 targets, no hazard |
| 3 | Easy | 2 targets, 1 simple hazard |
| 4 | Easy+ | 3 targets, 1 hazard |
| 5 | Medium | 3 targets, 2 hazards |
| 6 | Medium+ | Bounce opportunity, 2 hazards |
| 7+ | Hard | Denser layouts, still fair |

Difficulty should increase through:

- More targets.
- More hazards.
- More spatial planning.
- Bounce usage.
- Escape pressure.

Difficulty should not increase through:

- Tiny hitboxes.
- Pixel-perfect gaps.
- Invisible rules.
- New unrelated puzzle types.

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
- Practice again button.

## Implementation Tasks

### 1. Run State Machine

States:

- home.
- countdown.
- drawing.
- locomotion.
- resolvingSuccess.
- resolvingFailure.
- finished.
- results.

### 2. Gesture Input System

- Capture pointer down, move, and up.
- Store raw gesture samples.
- Lock to one pointer.
- Smooth or resample path.
- Reject very short gestures.
- Render line while drawing.
- Start locomotion on release.

### 3. Locomotion System

- Convert gesture points to displacement vectors.
- Move line head along repeated vector sequence.
- Maintain head-position history.
- Render trailing body at original gesture length.
- Keep speed constant.
- Preserve deterministic behavior for future replay/server validation.

### 4. Boundary System

- Reflect vertical movement at top and bottom.
- Detect when the entire body has escaped left or right.
- Fail only if horizontal escape happens before all targets are collected.

### 5. Puzzle Model

Define shared types:

- `PuzzleLayout`.
- `TargetCircle`.
- `HazardCircle`.
- `Point`.
- `Gesture`.
- `LineBody`.

### 6. Geometry Helpers

Implement:

- Distance point to point.
- Distance point to segment.
- Segment/circle collision.
- Polyline/circle collision.
- Body bounds.
- Gesture length.
- Resampling.

### 7. Puzzle Generator

- Generate deterministic layouts from seed and puzzle index.
- Generate targets.
- Generate hazards.
- Add validation/retry loop.
- Add fixed deterministic test seeds.

### 8. Scoring

- Calculate base score.
- Calculate speed bonus.
- Calculate combo bonus.
- Track puzzles solved.
- Track highest combo.

### 9. Feedback

- Target pop/fade.
- Success flash.
- Score popup.
- Combo pulse.
- Hazard suck-in/collapse.
- Failure shake.
- Quick reset.
- Time-up transition.

### 10. Results Screen

- Show local run summary.
- Show best local score if available.
- Allow practice replay of the same daily seed if feasible.
- Allow return home.

## Milestone Build

At the end of Phase 1, a user can:

```text
Open app
Tap Play
Wait for countdown
Draw one gesture
Release
Watch the line repeat and move
Collect colored circles
Avoid black holes
Play for 30 seconds
See score and puzzles solved
Play again locally
```

## Validation Checklist

- [ ] First-time player understands colored circles and black holes without text.
- [ ] Drawing appears immediately under pointer/finger.
- [ ] Releasing starts locomotion instantly.
- [ ] The moving line repeats the drawn gesture pattern.
- [ ] The line body keeps the original gesture length.
- [ ] The tail follows the head path.
- [ ] Full-body collision collects targets.
- [ ] Full-body collision fails on hazards.
- [ ] Top and bottom bounce is visible and understandable.
- [ ] Full horizontal escape fails only when targets remain.
- [ ] A full 30-second run completes.
- [ ] Same UTC date generates the same target/hazard sequence.
- [ ] Scoring increases when puzzles are solved.
- [ ] Combo increases on consecutive solves.
- [ ] Failure resets current puzzle without ending the run.
- [ ] Results screen appears when timer ends.
- [ ] Mobile viewport is playable.

## Acceptance Criteria

Phase 1 is complete when the local game loop is fun enough to replay without leaderboard support and the living-line mechanic is clearly the center of the experience.

## Risks

### Locomotion Feels Like a Bug Instead of Magic

Mitigation:

Tune smoothing, speed, line width, and release transition until the repeated motion is readable.

### Collision Feels Unfair

Mitigation:

Use visible collision alignment, generous radii, and clear collision feedback.

### Puzzles Are Too Easy or Too Hard

Mitigation:

Start with conservative layout archetypes and add deterministic seed review.
