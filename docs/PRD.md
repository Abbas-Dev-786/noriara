# Product Requirements Document

# Project Name

**Daily Line** *(Working Title)*

> Draw once. Let it move. Collect them all.

Version: 1.0 (Phase 1 MVP)

Status: Draft

Platform:

- Reddit Devvit
- Devvit Web
- Phaser

---

## 1. Vision

Build the most replayable daily gesture puzzle game on Reddit.

Players return every day to compete in a new 30-second challenge where they shape living lines. A player draws one continuous gesture, releases, and the line comes alive. It repeats the exact movement pattern over and over, collecting colored circles while avoiding black holes.

The game is inspired by the magical clarity of Blek: simple input, expressive solutions, and a moving line that feels personal.

The game is designed around three principles:

- One gesture creates the entire solution.
- The line keeps moving after release.
- Every level has many elegant possible solutions.

---

## 2. Problem Statement

Most Reddit games are fun once.

Very few become habits.

Players need a reason to return tomorrow and a mechanic worth mastering.

Daily Line creates anticipation through:

- A new daily seed.
- The same fair puzzle sequence for everyone.
- Fast runs with visible skill expression.
- Daily leaderboards.
- Replays that are interesting to watch.

---

## 3. Product Goal

Create a daily ritual.

Target player behavior:

```text
Open Reddit
Start today's Daily Line run
Draw living gestures for 30 seconds
Compare score
Watch top replay
Return tomorrow
```

---

## 4. Success Metrics

Primary KPI:

- Daily Active Users (DAU)

Secondary KPIs:

- D1 retention.
- D7 retention.
- Average session length.
- Average puzzles solved.
- Average daily attempts.
- Leaderboard participation.
- Replay views.

MVP success:

- 1,000+ daily plays.
- More than 35% D1 retention.
- Average session longer than 40 seconds.
- 80% of players collect at least one target in their first session.
- Load time under 2 seconds.

---

## 5. Target Audience

Primary:

- Puzzle lovers.
- Players who enjoy Blek, Monument Valley, Railbound, Euclidean Lands, Klocki, and elegant mobile puzzle games.

Secondary:

- Competitive players.
- Players who enjoy daily challenges, speedrunning, leaderboards, and personal bests.

Tertiary:

- Casual Reddit users looking for 30-second entertainment.

---

## 6. Product Pillars

### Elegant

One mechanic. Infinite personality.

### Magical

The player's drawing comes alive and keeps moving.

### Competitive

Everyone plays the same daily sequence.

### Fair

No random gameplay changes after the run starts. Skill determines the score.

### Watchable

Top replays should be entertaining because every solution looks different.

---

## 7. Core Gameplay

Every day players receive today's Daily Run.

A Daily Run consists of 30 seconds.

Each puzzle contains only:

- Colored circles to collect.
- Black holes to avoid.
- The playfield boundaries.

The player draws one continuous gesture. When they release, the drawing becomes a moving line.

The moving line:

- Keeps the length of the original gesture.
- Repeats the gesture's movement pattern indefinitely.
- Moves at a constant speed.
- Collides along its whole body, not only at the head.
- Collects colored circles on contact.
- Is destroyed if any part touches a black hole.
- Bounces on the top and bottom boundaries.
- Fails if it fully leaves the left or right side before collecting all targets.

If all colored circles are collected, the puzzle succeeds and the next puzzle appears immediately.

If the line fails, the current puzzle resets and the player draws again. Failure costs time, not progress.

---

## 8. Core Gameplay Loop

```text
Player opens game
Countdown starts
30-second timer begins
Puzzle appears
Player draws one gesture
Player releases
Line comes alive
Line collects targets or fails
Next puzzle or retry
Timer ends
Final score
Leaderboard
Replay
Return tomorrow
```

---

## 9. Daily Challenge

Every UTC day has one unique seed.

Everyone receives the exact same puzzle sequence for that day.

The puzzle generator must be deterministic so the client, server, and replay viewer can reconstruct the same boards.

---

## 10. Puzzle Structure

Phase 1 puzzles use a single canonical grammar:

- Colored target circles.
- Black hazard circles.
- Top and bottom bounce boundaries.
- Left and right escape boundaries.
- Player-created moving gesture line.

There are no Phase 1 start nodes, goal nodes, checkpoints, switches, walls, or separate route objectives.

The objective is always:

```text
Collect every colored circle without touching a black hole.
```

---

## 11. Gesture Capture

The entire game is built around capturing one continuous touch or mouse gesture.

Capture requirements:

- Record pointer coordinates as an ordered array of 2D points.
- Reject gestures that are too short to produce meaningful movement.
- Smooth or resample the gesture so the line looks fluid.
- Use release as the transition from drawing to locomotion.
- The drawn gesture length becomes the permanent visible body length for that attempt.

Collision with targets and hazards starts after release, when the line is alive.

---

## 12. Locomotion Model

After release, the line does not simply fly straight.

It repeats the player's gesture movement.

Implementation model:

- Calculate the sequence of displacements between consecutive gesture points.
- Move the line head through those displacements at constant speed.
- When the head reaches the end of the gesture, continue by applying the same displacement sequence again.
- Snap each repeated copy end-to-start so the movement path is continuous.
- Render only the trailing segment whose length equals the original gesture length.
- The tail follows the exact same repeated path as the head.

This creates the "living line" effect: the drawing becomes a moving creature that keeps performing the player's motion.

---

## 13. Boundaries

Top and bottom:

- Solid reflective boundaries.
- When the moving line crosses either boundary, its vertical trajectory reflects.
- The line continues moving and repeating its pattern after the bounce.

Left and right:

- Escape boundaries.
- If the entire line leaves the screen horizontally and targets remain, the attempt fails.
- If all targets have already been collected, the puzzle succeeds before escape matters.

---

## 14. Difficulty Curve

Difficulty should increase through:

- More colored targets.
- More black holes.
- More spatial planning.
- Target and hazard placement that requires expressive gesture design.
- Larger or trickier board relationships.

Difficulty should not increase through:

- Tiny hitboxes.
- Pixel-perfect gaps.
- Hidden rules.
- Text instructions.
- Extra Phase 1 entity types.

---

## 15. Scoring

Initial formula:

```text
Score = Puzzle Value + Speed Bonus + Combo Bonus
```

Puzzle value increases with puzzle index and difficulty.

Speed bonus rewards fast solves.

Combo bonus rewards consecutive puzzle solves without failed attempts.

Failure resets the combo but does not end the run.

---

## 16. Timer

The main run lasts 30 seconds.

The timer:

- Starts after countdown.
- Cannot pause.
- Ends the current run immediately at zero.
- Does not reset when a puzzle fails.

---

## 17. Leaderboards

Daily leaderboard displays:

- Rank.
- Player.
- Score.
- Puzzles solved.
- Final solve timestamp or tie-breaker metadata.

Future leaderboard surfaces:

- Friends.
- Weekly.
- Seasonal.
- Personal best.

---

## 18. Replay System

Replays are essential because solutions are expressive.

Store:

- Daily seed.
- Puzzle IDs.
- Raw or resampled gesture point arrays.
- Gesture release timestamps.
- Solve/fail events.
- Final score.

Replay viewer reconstructs the boards and plays the moving lines back deterministically.

MVP replay scope:

- Current user's own replay.
- Top 10 daily replays.

---

## 19. Progression

There is no XP, leveling, currency, or equipment.

Progression is mastery.

Show:

- Best score.
- Current streak.
- Highest puzzle reached.
- Personal best.
- Best rank.

---

## 20. Functional Requirements

Gameplay:

- Capture one continuous gesture.
- Smooth and resample the gesture.
- Start locomotion on release.
- Repeat the gesture movement indefinitely.
- Render a constant-length moving line.
- Detect collision across the full line body.
- Collect colored targets.
- Destroy on black-hole collision.
- Bounce on top and bottom.
- Fail on full horizontal escape with targets remaining.
- Advance immediately after all targets are collected.
- Run for 30 seconds.

Backend:

- Resolve daily seed.
- Store official run state.
- Validate submitted gesture/replay data.
- Recompute score.
- Store leaderboard entries.
- Return replay data.

Frontend:

- Render puzzles.
- Capture gesture input.
- Animate the living line.
- Show timer, score, and combo.
- Show results, leaderboard, and replay screens.

---

## 21. Non-Functional Requirements

- Load time under 2 seconds.
- 60 FPS gameplay.
- Input latency under 16 ms.
- Mobile-first layout.
- Deterministic replay.
- Colorblind-safe palette.
- Large touch targets.
- Reduced motion option.

---

## 22. Edge Cases

- Gesture is too short: ignore and let the player draw again.
- Player closes app mid-run: official run is invalid or treated according to server policy.
- Network lost after run: retry submission if run token remains valid.
- Invalid replay: reject.
- Duplicate official submission: reject.
- Generated puzzle is invalid: reject during generation and create another deterministic candidate.

---

## 23. Anti-Cheat

The server validates:

- Daily seed.
- Puzzle sequence.
- Gesture point arrays.
- Release timestamps.
- Solve order.
- Movement simulation.
- Collision outcomes.
- Completion timing.
- Final score.

Client-reported scores are never trusted.

---

## 24. Out of Scope for Phase 1

- Start-to-goal path puzzles.
- Connect templates.
- Cover templates.
- Efficiency route objectives.
- Switches.
- Teleporters.
- Walls.
- Moving obstacles.
- Community-created puzzles.
- Weekly events.
- Cosmetics.
- Achievements.
- Monetization.

---

## 25. Future Roadmap

Future mechanics may be added only if they preserve the living-gesture identity.

Examples:

- Moving targets.
- Gravity or wind fields that affect the moving line.
- Portals.
- Mirrors.
- Seasonal hazard variants.
- Community-authored target/hazard layouts.

Future mechanics must not turn the game into a generic draw-a-path puzzle.

---

## 26. Definition of Success

A successful MVP should make players feel:

> "I can make a better line."

> "How did the top player draw that?"

> "I want to see tomorrow's board."

If those three emotions exist, the product has achieved its core objective.

---

## 27. Open Questions

- Should each user get one official run per day, or unlimited attempts with best score?
- Should practice mode be available before the official run, after it, or both?
- How much replay data can Devvit storage comfortably support?
- Should top replays unlock only after a player submits today's run?
- Should tie-breakers prioritize more puzzles solved, faster solve time, fewer failures, or earlier submission?
