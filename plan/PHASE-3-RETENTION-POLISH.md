# Phase 3 - Retention and Polish

## Goal

Make Daily Line feel like a product players want to return to tomorrow.

This phase ends when the app has streaks, personal stats, replay viewing, accessibility options, and polished game feel.

## Why This Phase Exists

The core loop gets people to play. Retention systems and polish make them come back.

## Scope

### Included

- Current streak.
- Longest streak.
- Personal best.
- Highest puzzle reached.
- Total runs.
- Top 10 replay storage.
- Replay viewer.
- Replay controls.
- Improved results screen.
- Sound toggles.
- Reduced motion.
- High contrast mode.
- Haptic toggle where supported.
- Improved animations.
- Mobile pass.

### Not Included

- Community puzzle builder.
- Weekly tournaments.
- Monthly seasons.
- Cosmetics store.
- Friends leaderboard unless Devvit APIs make it easy.

## Retention Features

### Streaks

Rule:

Submitting an official run today increments or starts the streak.

If the player missed the previous UTC day, streak resets to 1.

Displayed on:

- Home.
- Results.
- Stats screen.

### Personal Stats

Track:

- Current streak.
- Longest streak.
- Best score.
- Best rank.
- Highest puzzle reached.
- Total official runs.
- Total puzzles solved.

### Personal Best

The results screen should compare today against the user's previous best:

- New personal best.
- Score delta.
- Puzzle count delta.

## Replay System

### Replay Capture

Store:

- Daily seed.
- Puzzle ids.
- Gesture point samples.
- Release timestamps.
- Solve events.
- Failure events.
- Timing.
- Final score.

### Replay Storage Policy

Store:

- Top 10 daily leaderboard replays.
- Current user's own replay.

Avoid storing every replay forever.

### Replay Viewer

Features:

- Play/pause.
- Restart.
- Exit.
- Show score and rank.
- Replay the drawing phase and living-line locomotion over recreated puzzles.

## UX Polish

### Game Feel

Improve:

- Line smoothing.
- Rounded caps.
- Success flash.
- Score popup.
- Combo pulse.
- Camera pulse.
- Failure shake.
- Time-up transition.

### Audio

Add:

- Countdown tick.
- Draw sound if not annoying.
- Success chime.
- Failure click.
- Time-up bell.

All audio must respect sound toggle.

### Haptics

Add where supported:

- Micro pulse on countdown.
- Short pulse on success.
- Soft bump on failure.

All haptics must respect haptic toggle.

## Accessibility

Add:

- High contrast mode.
- Reduced motion mode.
- Sound toggle.
- Haptic toggle.
- Large touch target review.
- Colorblind-safe palette pass.

Do not rely on color alone. Use shape, motion, and icons as secondary signals.

## UI Screens

### Stats Screen

Shows:

- Current streak.
- Best score.
- Best rank.
- Total runs.
- Highest puzzle reached.

### Replay Screen

Shows:

- Replay canvas.
- Minimal controls.
- Player rank and score.

### Settings Sheet

Shows:

- Sound.
- Haptics.
- Reduced motion.
- High contrast.

## Implementation Tasks

### 1. Stats Storage

- Add player stats service.
- Update stats after accepted submission.
- Add `/api/stats`.

### 2. Streak Logic

- Implement UTC date comparison.
- Increment/reset streak after accepted official run.
- Add tests for date edge cases.

### 3. Replay Serialization

- Compress gesture samples if needed.
- Version replay format.
- Add replay size guard.

### 4. Replay Viewer

- Recreate puzzle sequence.
- Animate gesture drawing and living-line movement.
- Add controls.

### 5. Replay Leaderboard Integration

- Add replay button to top leaderboard entries where replay exists.
- Add replay button to user's result.

### 6. Accessibility Settings

- Store locally and optionally server-side.
- Apply settings to React and Phaser.

### 7. Polish Pass

- Improve animations.
- Tune timing.
- Tune colors.
- Verify mobile layout.

## Milestone Build

At the end of Phase 3, a user can:

```text
Play official daily run
See streak and personal best
Open leaderboard
Watch a top replay
Open stats
Adjust accessibility settings
Return tomorrow with persistent progress
```

## Validation Checklist

- [ ] Streak increments after a valid daily run.
- [ ] Streak resets after missed day in tests.
- [ ] Personal best updates correctly.
- [ ] Top replay can be watched.
- [ ] Replay matches submitted run.
- [ ] Replay controls work.
- [ ] High contrast mode changes gameplay visuals.
- [ ] Reduced motion removes major pulses/shakes.
- [ ] Sound and haptic toggles work.
- [ ] Mobile layout has no overlapping UI.

## Acceptance Criteria

Phase 3 is complete when the app clearly communicates progress, comparison, and a reason to return tomorrow.

## Risks

### Replay Payloads Become Too Large

Mitigation:

Sample gesture points at a fixed interval, simplify gestures without changing motion meaning, cap replay count, and reject oversized submissions.

### Polish Delays Core Work

Mitigation:

Prioritize game feel changes that directly affect drawing, success, failure, and replay comprehension.
