# Daily Line Master Plan

## Product Goal

Build a Reddit-native daily competitive puzzle game using Devvit Web and Phaser.

Players draw one continuous line to solve as many short puzzles as possible in a 30-second daily run. Everyone receives the same UTC daily puzzle sequence. The product loop is:

```text
Open Reddit
Start today's run
Solve puzzles for 30 seconds
Submit score
Compare rank
Watch top replay
Return tomorrow
```

## North Star

Daily Line should make players think:

- I can beat yesterday.
- I want to see how the top player solved it.
- I wonder what tomorrow's challenge will be.

## Core Product Pillars

### 1. Daily Habit

The game must give users a reason to return every day through daily seeds, personal bests, streaks, and leaderboards.

### 2. Competitive Fairness

Everyone plays the same challenge for the same UTC day. The server validates submitted runs before accepting scores.

### 3. One-Mechanic Mastery

The player draws a single continuous line. Depth comes from puzzle layouts, route planning, timing, and optimization.

### 4. Short Sessions

The main run is 30 seconds. A complete session should fit naturally inside Reddit browsing behavior.

### 5. Replayable Spectatorship

Top runs should be watchable. Replays should help players learn and create curiosity.

## Complete Product Scope

The complete product includes:

- Devvit Web app shell.
- Phaser 3 gameplay canvas.
- React UI for screens, HUD, leaderboards, and replay controls.
- Daily UTC seed system.
- Procedural puzzle generator.
- Puzzle validation.
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
- Future seasonal mechanics.
- Future community-created puzzles.
- Future weekly and monthly events.

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
| 1 | MVP Daily Run | A complete 30-second single-player daily run works |
| 2 | Competitive Loop | Scores, leaderboard, one official daily run, and basic anti-cheat work |
| 3 | Retention and Polish | Streaks, stats, replays, accessibility, mobile polish |
| 4 | Content Expansion | More puzzle types, generator quality, difficulty simulation |
| 5 | Community and Live Ops | Community puzzles, events, seasons, moderation, and live operations |

## Recommended MVP Boundary

Phase 1 should not attempt the full product. It should prove the core game is fun:

- 30-second timer.
- One continuous line input.
- Three puzzle types: Connect, Collect, Avoid.
- Deterministic daily seed.
- Local score calculation.
- End screen.
- Basic visual feedback.

Leaderboards, server submissions, replays, streaks, and anti-cheat should start in Phase 2 and Phase 3.

## Primary Risks

### Puzzle Generator Quality

If generated puzzles feel random, unfair, repetitive, or unsolvable, the game will not retain users.

Mitigation:

- Start with simple templates.
- Add generated puzzle validation early.
- Build deterministic test seeds.
- Keep precision requirements generous.

### Anti-Cheat Complexity

Client-reported scores cannot be trusted.

Mitigation:

- Capture path data and timestamps.
- Recompute score server-side.
- Validate daily seed, puzzle order, solve timing, and impossible movements.
- Store only validated scores.

### Scope Creep

The full design includes seasons, cosmetics, community puzzles, and live ops. Building those too early will delay the playable product.

Mitigation:

- Keep Phase 1 and Phase 2 focused on the daily competitive loop.
- Add future systems only after retention basics work.

### Performance and Input Feel

The drawing line must feel instant and smooth.

Mitigation:

- Use Phaser for pointer input and rendering.
- Test on mobile viewport early.
- Keep gameplay UI minimal.
- Avoid heavy runtime puzzle computation during active drawing.

## Final Product Success Criteria

Daily Line is successful when:

- A new user understands the goal in under 5 seconds.
- A first session completes in under 1 minute.
- The daily run feels fair and replayable.
- The leaderboard creates immediate comparison.
- Top replays are interesting to watch.
- Players have a clear reason to return tomorrow.

