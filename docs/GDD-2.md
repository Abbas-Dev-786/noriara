# Game Design Document

# Part 2 - Systems Design

# Project

**Daily Line** *(Working Title)*

Version:

1.0

Document:

Game Systems Design

---

## 1. System Philosophy

Every system exists to support one mechanic:

> A drawn gesture becomes a moving line that repeats itself.

Nothing else belongs in Phase 1 unless it improves that loop.

---

## 2. Daily Challenge System

Every player in the world plays the same seeded challenge each UTC day.

This ensures:

- Fair competition.
- Comparable scores.
- Shared discussion.
- Replayable spectator value.

Daily lifecycle:

```text
00:00 UTC
New daily seed
Deterministic puzzle sequence
Leaderboard reset
Players compete
23:59 UTC
Leaderboard locked
Tomorrow begins
```

---

## 3. Endless Run System

Daily Line is not a campaign.

A run is a 30-second sequence of short gesture puzzles.

Flow:

```text
Puzzle appears
Player draws one gesture
Line moves
Puzzle succeeds or resets
Next puzzle on success
Timer ends
Results
```

---

## 4. Canonical Phase 1 Puzzle Grammar

Phase 1 has one puzzle type:

> Collect all colored circles while avoiding black holes with a living repeated gesture.

Allowed board elements:

- Colored target circles.
- Black hazard circles.
- Top and bottom bounce boundaries.
- Left and right escape boundaries.
- The player's moving line.

Not allowed in Phase 1:

- Start points.
- Goal nodes.
- Connect puzzles.
- Cover puzzles.
- Efficiency route objectives.
- Switches.
- Teleporters.
- Walls.
- Moving obstacles.

Future content must extend the living-line model instead of replacing it.

---

## 5. Gesture System

Input states:

```text
idle
drawing
locomotion
success
failure
```

Drawing rules:

- Pointer down starts a single gesture.
- Pointer movement records an ordered point array.
- The raw path is smoothed and resampled.
- Pointer up ends drawing and starts locomotion.
- Multi-touch should be ignored or locked to the first pointer.
- A gesture below minimum length is discarded.

Stored data:

- Raw points.
- Smoothed/resampled points.
- Start timestamp.
- Release timestamp.
- Puzzle index.

---

## 6. Locomotion System

The locomotion system turns the gesture into an infinite movement pattern.

Algorithm:

1. Convert the smoothed gesture into displacement vectors.
2. Move the line head along those vectors at constant speed.
3. When the final displacement is consumed, restart from the first displacement.
4. Apply each repeated displacement from the current head position.
5. Maintain a history of head positions.
6. Render only the trailing body whose arc length equals the original gesture length.
7. Use the same body segments for collision.

Required behavior:

- The line keeps moving after release.
- The body length remains constant.
- The tail follows the exact path of the head.
- The repeated path is continuous.
- The system remains deterministic for replay and server validation.

---

## 7. Boundary System

Top and bottom:

- Reflect vertical movement.
- Preserve speed.
- Continue the repeated gesture after reflection.

Left and right:

- Do not bounce.
- If the entire body exits horizontally and targets remain, the attempt fails.

The line can partially leave the screen. Failure occurs only when the whole body is gone horizontally and the puzzle is unsolved.

---

## 8. Target System

Colored circles are objectives.

Rules:

- A target is collected when any moving line segment intersects it.
- Collected targets disappear immediately.
- The puzzle succeeds when all targets are collected.
- Target hit radii must be generous enough for mobile play.

Feedback:

- Soft pop.
- Fade out.
- Optional small sound.
- Optional haptic pulse.

---

## 9. Hazard System

Black circles are hazards.

Rules:

- Any body segment touching a hazard fails the attempt.
- The whole line body is dangerous, including the tail.
- Hazard hit radii must visually match collision radii.

Feedback:

- Black-hole/suck-in destruction if feasible.
- Otherwise, clear collapse/fade plus screen shake.
- Immediate redraw allowed.

---

## 10. Timer System

The match timer is 30 seconds.

Rules:

- Starts after countdown.
- Cannot pause.
- Does not reset on attempt failure.
- Ends the run immediately at zero.

Countdown:

```text
3
2
1
GO
```

---

## 11. Scoring System

Score rewards speed, consistency, and progress.

Initial formula:

```text
score = puzzleValue + speedBonus + comboBonus
```

Puzzle value:

- Increases with puzzle index and generated difficulty.

Speed bonus:

- Higher for faster puzzle solves.

Combo bonus:

- Increases after consecutive puzzle solves.
- Resets on failed attempt.

No score should depend on arbitrary gesture style in Phase 1.

---

## 12. Combo System

Purpose:

- Reward consecutive successful puzzles.

Rule:

```text
Solve puzzle -> combo + 1
Fail attempt -> combo = 0
Timer ends -> final combo recorded
```

Visual feedback:

- Pulse.
- Glow.
- Brief scale.

---

## 13. Procedural Puzzle Generator

Generator input:

- Daily seed.
- Puzzle index.
- Difficulty band.

Generator output:

- Target circle positions.
- Hazard circle positions.
- Board dimensions.
- Collision radii.
- Difficulty metadata.

Generator pipeline:

```text
daily seed
puzzle index
difficulty band
target placement
hazard placement
layout validation
playable puzzle
```

The generator should create layouts that invite different gestures, not layouts with one prescribed path.

---

## 14. Generated Puzzle Validation

Every generated puzzle must satisfy:

- Targets and hazards fit inside the safe play area.
- Targets are not visually overlapping.
- Hazards are not placed directly on targets.
- The first puzzle is solvable by a simple gesture.
- Early puzzles have no tiny gaps or unfair traps.
- Collision radii match visual sizes.
- The puzzle can plausibly be solved in 1-5 seconds by a skilled player.

Long-term validation should include automated simulation or curated seed review, but Phase 1 can begin with conservative layouts and deterministic seed tests.

---

## 15. Difficulty System

Difficulty increases by adjusting:

- Number of targets.
- Number of hazards.
- Distance between targets.
- Hazard placement relative to likely repeated motion.
- Need to use top/bottom bounce.
- Spatial density while preserving fairness.

Difficulty must not increase by adding unrelated puzzle types in Phase 1.

---

## 16. Replay System

Every official run should store enough information to replay the living lines.

Replay payload:

- Version.
- Daily seed.
- Puzzle IDs.
- Gesture point arrays.
- Release timestamps.
- Solve/failure events.
- Final score.
- Puzzles solved.

Replay flow:

```text
Select replay
Load seed and gestures
Recreate puzzles
Replay drawing phase
Replay locomotion phase
Show solves and failures
Finish
```

The replay system must use the same deterministic locomotion and collision code as gameplay.

---

## 17. Leaderboard System

Daily leaderboard displays:

- Rank.
- Player.
- Score.
- Puzzles solved.

Sorting:

1. Highest score.
2. More puzzles solved.
3. Faster final solve timestamp.
4. Earlier submission time.

---

## 18. Official Run Rules

Default:

- One official leaderboard submission per logged-in user per UTC day.

Practice:

- Can exist outside official scoring.
- Does not affect leaderboard.

This decision can be revisited before Phase 2 implementation.

---

## 19. Server Validation

The client is not trusted for final score authority.

Server validation should:

- Recreate the daily puzzle sequence.
- Simulate submitted gestures.
- Reproduce locomotion.
- Reproduce target collection.
- Reproduce hazard and boundary failures.
- Recompute score.
- Reject impossible timing or impossible pointer movement.
- Reject duplicate official submissions.

---

## 20. Streaks and Stats

Streaks:

- Increment when an official run is submitted.
- Reset after a missed UTC day.

Stats:

- Current streak.
- Longest streak.
- Best score.
- Best rank.
- Highest puzzle reached.
- Total official runs.
- Total puzzles solved.

---

## 21. Retention Systems

Daily return:

- New seed.
- New leaderboard.
- Personal improvement.

Competitive return:

- Beat yesterday.
- Climb daily rank.
- Study top replays.

Curiosity return:

- Watch how different players solved the same board with different gestures.

---

## 22. Future Expansion Hooks

Future systems may include:

- Moving targets.
- Gravity or wind fields that bend the moving line.
- Portals.
- Mirrors.
- Weekly events.
- Community-authored layouts.

Every future mechanic must preserve the living gesture identity.

---

## 23. System Design Principles

Every system must:

- Support the living-line mechanic.
- Add mastery, not grind.
- Work in under 30 seconds.
- Remain deterministic.
- Support server validation.
- Be understandable without a tutorial.

If a proposed feature violates these principles, it should be reconsidered before entering the roadmap.
