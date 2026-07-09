# Phase 4 - Content Expansion

## Goal

Increase puzzle variety and long-term replayability without harming clarity.

This phase ends when the game has a stronger procedural content engine, additional puzzle types, and better difficulty control.

## Why This Phase Exists

Daily retention depends on fresh content. The game should not feel like the same few layouts every day.

## Scope

### Included

- Improved generator architecture.
- Better generated puzzle validation.
- Difficulty simulation tools.
- Additional puzzle types:
  - Cover.
  - Efficiency.
- More obstacle shapes.
- Difficulty tuning dashboard or dev screen.
- Deterministic seed test suite.
- Optional curated challenge seeds.

### Not Included

- Public community puzzle builder.
- Seasonal live events.
- Cosmetics economy.
- Complex dynamic mechanics unless generator quality is already strong.

## New Puzzle Types

### Cover

Goal:

Cover a target shape or area with one continuous line.

Validation:

- Enough target coverage.
- No forbidden collision.
- Coverage threshold is generous enough for mobile.

Risk:

Can be hard to validate fairly.

Recommendation:

Introduce only after Connect, Collect, and Avoid feel stable.

### Efficiency

Goal:

Solve with a short or optimized route.

Validation:

- Path solves required objective.
- Score bonus depends on line length or route quality.

Risk:

Can confuse players if not visually clear.

Recommendation:

Treat as a bonus scoring layer before making it a standalone puzzle type.

## Generator Improvements

Add:

- Template weighting.
- Difficulty bands.
- Puzzle rejection reasons.
- Seed preview tool.
- Batch generation test.
- Difficulty metadata.

Generator should answer:

- Is this puzzle solvable?
- Is this puzzle fair on mobile?
- How long should an average player need?
- Does it fit the intended difficulty band?
- Does it duplicate a recent layout too closely?

## Difficulty Simulation

Create a dev-only script or screen that:

- Generates many daily seeds.
- Samples first 20 puzzles per seed.
- Reports template distribution.
- Reports rejected puzzle count.
- Reports estimated difficulty curve.
- Flags impossible or too-dense layouts.

## Content Quality Bar

Every new mechanic must be:

- Learnable without text.
- Solvable in 1-5 seconds.
- Compatible with touch.
- Deterministic.
- Server-validatable.
- Replayable.
- Visually readable on mobile.

## Implementation Tasks

### 1. Generator Refactor

- Separate template selection from layout creation.
- Add difficulty band config.
- Add rejection diagnostics.

### 2. Add Cover Prototype

- Implement target coverage model.
- Add renderer.
- Add validation.
- Test on mobile.

### 3. Add Efficiency Scoring

- Track line length.
- Add route bonus.
- Display bonus clearly.
- Avoid punishing casual players too harshly.

### 4. Add Dev Simulation

- Batch-generate seeds.
- Print stats.
- Save failing seeds for debugging.

### 5. Tune Daily Curve

- Adjust first 10 puzzle distribution.
- Ensure first puzzle is always easy.
- Ensure expert puzzles do not appear too early.

## Milestone Build

At the end of Phase 4, a user can:

```text
Play multiple days
See varied puzzle sequences
Encounter expanded puzzle types
Still understand every puzzle immediately
Experience smoother difficulty progression
```

## Validation Checklist

- [ ] Generator can batch-create many seeds without impossible puzzles.
- [ ] Puzzle distribution is varied.
- [ ] Difficulty curve is smooth.
- [ ] Cover puzzles validate fairly if enabled.
- [ ] Efficiency bonus is understandable.
- [ ] Server validation still matches client behavior.
- [ ] Replay viewer supports new puzzle types.
- [ ] Mobile readability remains strong.

## Acceptance Criteria

Phase 4 is complete when content variety improves without weakening the one-line clarity of the game.

## Risks

### New Mechanics Reduce Clarity

Mitigation:

Gate every mechanic against the design rules. Remove mechanics that need text instructions.

### Generator Becomes Hard to Debug

Mitigation:

Log rejection reasons and keep failing seeds reproducible.

