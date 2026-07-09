# Game Design Document

# Part 4 - Content Bible, Puzzle Mechanics & Live Operations

# Project

**Daily Line** *(Working Title)*

Version:

1.0

Document:

Content Bible & Live Operations

---

## 1. Purpose

This document defines the content vocabulary for Daily Line.

The core product is not a generic line puzzle platform. It is a living-gesture puzzle game.

Every content decision must preserve this identity:

> The player draws a gesture, releases it, and the moving line repeats that gesture to collect colored circles while avoiding black holes.

---

## 2. Content Philosophy

Every puzzle should satisfy four principles.

### Easy to Read

The board contains simple geometry and no text instructions.

### Hard to Master

Depth comes from imagining how the gesture will repeat.

### Short

Each puzzle should be solvable in 1-5 seconds by a skilled player.

### Beautiful

Solutions should look elegant and be enjoyable to watch in replay.

---

## 3. Phase 1 Puzzle Grammar

Every Phase 1 puzzle is composed from:

```text
Colored target circles
Black hazard circles
Top/bottom bounce boundaries
Left/right escape boundaries
Player's living gesture line
```

Objective:

```text
Collect all colored circles without touching black holes.
```

No other active puzzle vocabulary belongs in Phase 1.

---

## 4. Core Entities

### Colored Target Circles

Role:

- Objective.

Rules:

- Collected by any part of the moving line.
- Disappear after collection.
- All targets collected means puzzle success.

Difficulty variables:

- Count.
- Spacing.
- Placement relative to hazards.
- Placement relative to bounce opportunities.

### Black Hazard Circles

Role:

- Failure object.

Rules:

- Any moving line body collision fails the attempt.
- Visual radius must match collision radius.
- Failure should clearly show the collision.

Difficulty variables:

- Count.
- Radius.
- Placement.
- Relationship to likely repeated gesture paths.

### Boundaries

Top and bottom:

- Bounce.

Left and right:

- Escape/fail if unsolved.

Difficulty variables:

- Whether a puzzle benefits from bounce.
- How much room the player has before horizontal escape.

---

## 5. Explicitly Excluded from Phase 1

The following are not Phase 1 puzzle types:

- Connect Start -> Goal.
- Cover an object.
- Efficiency or shortest path objectives.
- Route puzzles.
- Walls.
- Buttons.
- Switches.
- Teleporters.
- Pressure plates.
- Moving obstacles.
- Rotating barriers.

These may be considered later only if they enhance the living-line mechanic and remain understandable without text.

---

## 6. Difficulty Variables

The generator adjusts:

- Target count.
- Hazard count.
- Target spacing.
- Hazard radius.
- Hazard proximity to likely paths.
- Need for bouncing.
- Board density.

Never increase difficulty by:

- Smaller-than-expected hitboxes.
- Invisible rules.
- Pixel-perfect precision.
- Required text instructions.
- Abruptly introducing unrelated puzzle types.

---

## 7. Puzzle Generation Rules

Every generated puzzle must satisfy:

- Targets and hazards are visually distinct.
- No target overlaps a hazard.
- The first puzzle can be solved with a simple gesture.
- Early puzzles avoid hazards or use only obvious hazards.
- Hit radii are generous.
- The board fits mobile play.
- The puzzle supports many possible gesture solutions.
- The puzzle can be reconstructed deterministically from seed and index.

---

## 8. Difficulty Progression

Within a single run:

```text
Puzzle 1: tutorial board, one target, no hazard
Puzzle 2: two targets, no hazard
Puzzle 3: two targets, simple hazard
Puzzle 4: three targets, simple hazard
Puzzle 5: three targets, multiple hazards
Puzzle 6: denser layout with bounce opportunity
Puzzle 7+: expert layouts with more planning
```

The curve should feel natural.

Players should fail because their gesture plan did not work, not because the board used hidden rules.

---

## 9. Layout Archetypes

Phase 1 can vary layouts without adding new puzzle types.

### Open Sweep

Targets are spread across open space with few or no hazards.

Skill:

- Drawing a broad repeated motion.

### Thread the Hazard

Targets sit near a black hole.

Skill:

- Designing a curve that repeats cleanly without grazing the hazard.

### Bounce Catch

One or more targets reward using top/bottom bounce.

Skill:

- Predicting reflected motion.

### Cluster Split

Targets are separated into small clusters.

Skill:

- Creating a repeated motion that visits both clusters before escaping.

### Escape Pressure

Targets are placed so a line may leave horizontally before collecting all of them.

Skill:

- Choosing a gesture with enough vertical movement, curve, or bounce.

These are layout archetypes, not separate mechanics.

---

## 10. Future Mechanics Library

Future mechanics must preserve the core rule: draw once, release, line repeats.

Possible future additions:

- Moving targets.
- Moving hazards.
- Gravity wells that bend the moving line.
- Wind zones that offset movement.
- Portals that relocate the moving line.
- Mirrors that reflect trajectory.
- Seasonal target or hazard variants.

Each mechanic must be tested in practice or events before entering ranked daily play.

---

## 11. Live Operations Philosophy

Daily Line should feel alive because the daily seed creates fresh boards and competition.

Live operations should not add chores.

Retention comes from:

- New daily layouts.
- Leaderboards.
- Replays.
- Community discussion.
- Occasional carefully tested mechanics.

---

## 12. Daily Event

Every UTC day:

```text
New seed
New puzzle sequence
Leaderboard reset
Community competition
Top replays archived
```

---

## 13. Weekly Event - Future

Every Sunday, run a Community Championship.

Possible rules:

- Longer timer.
- Harder generated sequence.
- Separate leaderboard.
- Archived winners.

Weekly events must not replace the daily run as the primary mode.

---

## 14. Seasons - Future

Each season may introduce one mechanic that modifies the living line or board interaction.

Example sequence:

- Season 1: Core targets and black holes.
- Season 2: Moving targets.
- Season 3: Wind fields.
- Season 4: Gravity wells.
- Season 5: Portals.
- Season 6: Mirrors.

Season mechanics must be disabled by default until proven fair and server-validatable.

---

## 15. Community Content - Future

Community submissions should begin as target/hazard layouts, not arbitrary game rules.

Players can submit:

- Target positions.
- Hazard positions.
- Optional title.

Validation must check:

- Geometry.
- Mobile readability.
- Solvability.
- Abuse/moderation.
- Deterministic replay compatibility.

Recommended first version:

- Manual curation only.

---

## 16. Replay Ecosystem

Replays are core content.

Replay categories:

- Global #1.
- Current player's run.
- Most elegant.
- Fastest solve.
- Developer pick in the future.

Players should learn by watching how different gestures solve the same board.

---

## 17. Leaderboard Categories

Phase 1/2:

- Daily global.

Future:

- Weekly.
- Monthly.
- Friends.
- Country.
- All-time.

---

## 18. Cosmetic Roadmap - Future

Cosmetics must not affect gameplay.

Possible cosmetic unlocks:

- Line colors.
- Trail effects.
- Target pop effects.
- Profile frames.
- Seasonal themes.

Competitive fairness is mandatory.

---

## 19. Achievement System - Future

Potential achievements:

- Solve 100 puzzles.
- Reach combo x10.
- Finish top 100.
- Maintain a 30-day streak.
- Watch a top replay.

Achievements must not become required chores.

---

## 20. Community Progression - Future

Subreddit progress may increase as users solve daily puzzles.

Example:

```text
Daily solves
Community meter fills
New visual theme unlocks
Next weekly event changes
```

This should be cosmetic or content-based only. It must not affect ranked fairness.

---

## 21. Live Operations Tools

Needed tools:

- Preview tomorrow's seed.
- Force-disable bad seed.
- Replace daily seed if a severe issue is found before launch.
- View leaderboard anomalies.
- View replay reports.
- Archive daily winners.
- Feature curated layouts.

---

## 22. Moderation and Safety

Community submissions need:

- Rate limits.
- Report flow.
- Admin review.
- Rejection reasons.
- Abuse prevention.

Do not auto-publish user-generated layouts into ranked daily play until moderation is strong.

---

## 23. Anti-Content Rules

Never add:

- Loot boxes.
- Energy systems.
- Pay-to-win mechanics.
- Mandatory grinding.
- Artificial waiting.
- Mechanics that require long tutorials.
- Generic start-to-goal path puzzles in the core mode.

---

## 24. Long-Term Vision

Daily Line should evolve into a daily competitive living-gesture puzzle game.

Players should return because:

- There is a new board.
- They want to beat yesterday.
- They want to study top replays.
- They want to design a better line.
- The community is competing on the same daily seed.

The product can grow, but the identity must stay focused:

> Draw once. Release. Watch it move.
