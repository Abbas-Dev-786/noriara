# Daily Line Master Plan

## Product Goal

Build a Reddit-native daily competitive gesture puzzle game using Devvit Web, React, and Phaser.

Players draw one continuous gesture. When they release, the line comes alive, keeps its original body length, and repeats the captured movement pattern indefinitely. The moving line must collect every colored circle while avoiding black holes.

Everyone receives the same UTC daily puzzle sequence.

Product loop:

```text
Open Reddit
Start today's run
Draw living gesture lines for 30 seconds
Submit score
Compare rank
Watch top replay
Return tomorrow
```

## North Star

Daily Line should make players think:

- I can make a better line.
- I want to see how the top player drew that.
- I wonder what tomorrow's board will be.

## Core Product Pillars

### 1. Living Gesture

The player's drawing becomes the game object. It repeats the drawn movement and feels alive.

### 2. Daily Habit

Daily seeds, personal bests, streaks, leaderboards, and replays give users a reason to return.

### 3. Competitive Fairness

Everyone plays the same challenge for the same UTC day. The server validates submitted gestures before accepting scores.

### 4. One-Mechanic Mastery

Depth comes from shaping a repeating line that collects targets, avoids hazards, uses bounces, and stays on screen.

### 5. Watchable Replays

Top runs should be entertaining because every player's gesture solution looks different.

## Complete Product Scope

The complete product includes:

- Devvit Web app shell.
- Phaser gameplay canvas.
- React UI for home, HUD, results, leaderboards, and replay controls.
- Daily UTC seed system.
- Procedural target/hazard layout generator.
- Gesture capture and smoothing.
- Living-line locomotion.
- Full-body line collision.
- Top/bottom bounce boundaries.
- Left/right escape failure.
- 30-second daily run.
- Score, combo, speed bonus, and puzzle progression.
- Daily leaderboard.
- Personal bests and stats.
- Streaks.
- Replay capture and playback.
- Server-side anti-cheat validation.
- Accessibility controls.
- Mobile-first responsive UX.
- Audio, haptics, animation, and polish.
- Future seasonal mechanics that preserve living-gesture play.
- Future community-created target/hazard layouts.

## Development Strategy

Build the complete product in working milestones.

Each phase must satisfy three conditions before moving forward:

- The app runs locally.
- The milestone is playable or testable end to end.
- The acceptance checklist is complete.

## Phase Roadmap

| Phase | Name | Main Outcome |
| --- | --- | --- |
| 0 | Foundation | Devvit Web + React + Phaser scaffold runs locally |
| 1 | MVP Daily Run | A complete 30-second local run with living-line gesture puzzles works |
| 2 | Competitive Loop | Scores, leaderboard, one official daily run, and basic anti-cheat work |
| 3 | Retention and Polish | Streaks, stats, replays, accessibility, mobile polish |
| 4 | Content Expansion | Better target/hazard generator, difficulty simulation, future mechanic prototypes |
| 5 | Community and Live Ops | Community layouts, events, seasons, moderation, and live operations |

## Recommended MVP Boundary

Phase 1 should prove the core mechanic is fun.

Include:

- 30-second timer.
- One continuous gesture input.
- Gesture smoothing/resampling.
- Release-to-locomotion transition.
- Repeating movement pattern.
- Constant-length moving line body.
- Colored circles as targets.
- Black circles as hazards.
- Full-body collision.
- Top/bottom bounce.
- Left/right escape failure.
- Deterministic daily seed.
- Local score calculation.
- End screen.
- Basic visual feedback.

Do not include in Phase 1:

- Start-to-goal path puzzles.
- Connect templates.
- Cover templates.
- Efficiency route objectives.
- Switches.
- Teleporters.
- Walls.
- Moving obstacles.
- Leaderboards.
- Server submissions.
- Replay storage.
- Streaks.
- Full anti-cheat.

Leaderboards, server submissions, replays, streaks, and anti-cheat start in Phase 2 and Phase 3.

## Primary Risks

### Locomotion Does Not Feel Magical

If the line does not clearly repeat the player's gesture and feel alive, the game fails.

Mitigation:

- Implement gesture replay as the first real gameplay system.
- Tune speed, smoothing, and line length early.
- Test with many gesture shapes.

### Collision Feels Unfair

If the tail hits a black hole and the player cannot tell why, failure feels arbitrary.

Mitigation:

- Keep visual and collision radii aligned.
- Show clear collision feedback.
- Use generous target sizes.
- Avoid tiny gaps.

### Puzzle Generator Quality

If generated target/hazard layouts feel random, impossible, or repetitive, the game will not retain users.

Mitigation:

- Start with simple conservative layout archetypes.
- Add deterministic seed tests.
- Add layout validation and rejection reasons.
- Keep Phase 1 entity vocabulary small.

### Anti-Cheat Complexity

Client-reported scores cannot be trusted.

Mitigation:

- Capture gesture point arrays and timestamps.
- Recompute locomotion and scoring server-side.
- Validate daily seed, puzzle order, timing, collisions, and solve events.

### Scope Creep

The full roadmap includes seasons, cosmetics, community layouts, and live ops. Building those too early will delay the playable product.

Mitigation:

- Keep Phase 1 and Phase 2 focused on the daily competitive living-line loop.
- Add future systems only after the core mechanic is strong.

## Final Product Success Criteria

Daily Line is successful when:

- A new user understands colored targets and black holes in under 5 seconds.
- A first session completes in under 1 minute.
- Drawing feels immediate.
- Release makes the line feel alive.
- The daily run feels fair and replayable.
- The leaderboard creates immediate comparison.
- Top replays are interesting to watch.
- Players have a clear reason to return tomorrow.
