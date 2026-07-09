# Game Design Document (GDD)

# Part 2 — Systems Design

---

# Project

**Daily Line** _(Working Title)_

Version: 1.0

Document:
Game Systems Design

---

# 1. System Philosophy

The entire game revolves around one idea:

> **Every second should create meaningful progress.**

There are no filler mechanics.

No inventory.

No dialogue.

No waiting.

Every system either:

- Increases mastery
- Creates competition
- Improves replayability
- Encourages daily return

Nothing else belongs in Phase 1.

---

# 2. Daily Challenge System

## Objective

Every player in the world plays the exact same challenge each day.

This ensures:

- Fair competition
- Comparable scores
- Shared discussion
- Daily anticipation

---

## Daily Lifecycle

```text
00:00 UTC

↓

New Daily Seed Generated

↓

Puzzle Sequence Created

↓

Leaderboard Reset

↓

Players Compete

↓

23:59 UTC

↓

Leaderboard Locked

↓

Top Players Archived

↓

Tomorrow Begins
```

---

## Daily Rules

- One official puzzle sequence per day.
- Every player receives identical puzzles.
- Leaderboards are based only on today's seed.
- Yesterday's leaderboard becomes read-only.

---

# 3. Procedural Puzzle Generator

## Design Goal

Never manually design thousands of puzzles.

Instead:

Design **systems** that generate puzzles.

Procedural generation has long been used to improve replayability, but the best systems constrain randomness so puzzles remain interesting and solvable rather than arbitrary. :contentReference[oaicite:0]{index=0}

---

## Generator Pipeline

```text
Daily Seed

↓

Difficulty Level

↓

Puzzle Template

↓

Obstacle Generator

↓

Validation

↓

Playable Puzzle

↓

Serve To Player
```

---

## Inputs

- Daily Seed
- Puzzle Number
- Difficulty Index

---

## Outputs

- Start Position
- Goal
- Obstacles
- Valid Solution
- Estimated Difficulty

---

# 4. Puzzle Templates

Phase 1 should ship with a small number of highly polished templates.

## Template A

### Connect

Draw from A → B.

---

## Template B

### Cover

Cover an object completely.

---

## Template C

### Collect

Touch every checkpoint.

---

## Template D

### Avoid

Reach destination without touching obstacles.

---

## Template E

### Route

Find the shortest legal path.

---

Each template supports procedural variation.

---

# 5. Puzzle Validation

Every generated puzzle must satisfy:

✅ Solvable

✅ Single solution or acceptable multiple solutions

✅ Completable within expected time

✅ Difficulty within target range

Reject any generated puzzle that fails validation.

---

# 6. Difficulty System

Difficulty should increase gradually during a run.

Never spike suddenly.

---

## Difficulty Variables

Increase:

- Number of obstacles
- Path complexity
- Required planning
- Moving elements
- Decision points

Do **not** increase difficulty by:

- Tiny hitboxes
- Unfair precision
- Hidden rules

---

## Difficulty Curve

```text
0-5 sec

Tutorial

↓

5-10 sec

Easy

↓

10-15 sec

Easy+

↓

15-20 sec

Medium

↓

20-25 sec

Hard

↓

25-30 sec

Expert
```

---

# 7. Endless Run System

Unlike traditional level progression:

There is no final level.

Players continue solving puzzles until time expires.

This creates a natural personal best.

---

## Flow

```text
Puzzle

↓

Solved

↓

Generate Next

↓

Solved

↓

Generate Next

↓

Timer Ends
```

---

# 8. Timer System

## Match Timer

30 seconds.

Cannot pause.

Cannot extend.

Visible at all times.

---

## Countdown

```text
3

↓

2

↓

1

↓

GO
```

---

## End Condition

Timer reaches zero.

Current puzzle immediately ends.

Final score calculated.

---

# 9. Scoring System

Score rewards:

- Speed
- Accuracy
- Progress

---

## Base Formula

```text
Score

=

Puzzle Value

+

Speed Bonus

+

Combo Bonus
```

---

## Puzzle Value

Every puzzle has:

Base Score

Examples

Easy = 100

Medium = 200

Hard = 350

Expert = 500

---

## Speed Bonus

Fast completion awards bonus points.

Example:

```text
Solved in

1 second

↓

+50

Solved in

3 seconds

↓

+20
```

---

## Accuracy Bonus

Reserved for Phase 2.

Potential examples:

- Minimal line length
- No collisions
- Perfect route

---

# 10. Combo System

Purpose:

Reward consistency.

---

## Rule

Every consecutive solved puzzle increases combo.

Example:

Puzzle 1

1x

Puzzle 2

2x

Puzzle 3

3x

Failure

↓

Combo resets.

---

## Visual Feedback

Combo displayed with:

- Pulse animation
- Glow
- Increasing text scale

---

# 11. Leaderboard System

## Daily Leaderboard

Displays:

- Rank
- Username
- Score
- Puzzles Solved

---

## Sorting

Primary

Highest Score

Secondary

Fastest Completion Timestamp

---

## Future

- Friends
- Weekly
- Seasonal
- Country

---

# 12. Replay System

Every run stores:

- Daily Seed
- Puzzle IDs
- Drawing Coordinates
- Timestamps

This enables deterministic replay.

---

## Replay Flow

```text
Select Player

↓

Load Replay

↓

Reconstruct Input

↓

Animate Drawing

↓

Finish
```

---

## MVP

Replay Top 10 players.

---

# 13. Streak System

Players earn a streak by completing one official run.

---

## Rules

Play Today

↓

+1

Miss Tomorrow

↓

Reset

---

Displayed On:

- Home Screen
- Results Screen

---

# 14. Statistics

Player Profile shows:

- Current Streak
- Longest Streak
- Best Daily Rank
- Highest Score
- Total Runs
- Total Puzzles Solved

---

# 15. Daily Progression

The player should feel:

```text
Yesterday

↓

I solved 7

↓

Today

↓

I solved 9

↓

Tomorrow

↓

I'll reach 10
```

Progress is measured through mastery rather than XP.

---

# 16. Retention Systems

The MVP intentionally keeps retention lightweight.

## Daily Return

✔ New puzzle sequence

✔ New leaderboard

✔ Personal improvement

---

## Competitive Return

✔ Beat yesterday

✔ Beat friends

✔ Reach Top 100

---

## Curiosity Return

✔ Watch top replay

✔ Learn new routes

Replayability is strongest when repeated sessions continue to reveal new strategies or outcomes rather than simply repeating identical content. :contentReference[oaicite:1]{index=1}

---

# 17. Puzzle Economy

The game has **no**:

- Coins
- Gems
- Energy
- Loot Boxes
- Crafting
- Shops

Skill is the only currency.

---

# 18. Failure System

Failure is never punished heavily.

Failure costs:

Time.

Not progress.

Incorrect line:

↓

Instant reset

↓

Continue playing

---

# 19. Session End

At timer expiry:

```text
Time Up

↓

Freeze Gameplay

↓

Calculate Score

↓

Leaderboard

↓

Replay Option

↓

Return Home
```

---

# 20. Future Expansion Hooks

These systems are intentionally deferred.

## Community Puzzles

Players create puzzles.

---

## Weekly Tournament

Best score over seven days.

---

## Ghost Racing

Compete against yesterday's self.

---

## Boss Puzzle

Community unlocks a mega puzzle.

---

## Seasons

Monthly mechanics.

---

## Puzzle Voting

Community selects tomorrow's featured puzzle.

---

# 21. System Design Principles

Every future system must satisfy:

- Adds mastery, not grind.
- Encourages daily return.
- Works in under 30 seconds.
- Supports procedural generation.
- Preserves competitive fairness.
- Is understandable without a tutorial.

If a proposed feature violates these principles, it should be reconsidered before entering the roadmap.

---
