# Phase 4 - Content Expansion

## Goal

Increase puzzle variety and long-term replayability without weakening the living-gesture identity.

This phase ends when the game has a stronger target/hazard generator, better difficulty control, and carefully isolated prototypes for future mechanics that still use the same draw-release-repeat line model.

## Why This Phase Exists

Daily retention depends on fresh boards. The game should not feel like the same few target/hazard layouts every day.

Content expansion must not turn Daily Line into a generic path-drawing puzzle game.

## Scope

### Included

- Improved generator architecture.
- Better generated layout validation.
- More target/hazard layout archetypes.
- More black-hole size and placement patterns.
- Bounce-focused layouts.
- Difficulty simulation tools.
- Deterministic seed test suite.
- Optional curated challenge seeds.
- Future mechanic prototypes that preserve living-line locomotion.

### Not Included

- Generic Connect puzzles.
- Generic Cover puzzles.
- Generic Efficiency route objectives.
- Public community layout builder.
- Seasonal live events.
- Cosmetics economy.
- Complex dynamic mechanics unless generator quality is already strong.

## Content Expansion Rules

Every new content idea must preserve:

- One continuous gesture.
- Release-triggered locomotion.
- Repeated movement pattern.
- Constant-length moving line body.
- Colored targets as objectives.
- Black hazards or clearly equivalent failure objects.
- Deterministic replay and validation.

If the player is simply drawing a static route from point A to point B, the idea does not belong in the core mode.

## New Layout Archetypes

### Bounce Weave

Targets are positioned so top/bottom reflection helps collect them.

Validation:

- Bounce opportunity is visually discoverable.
- Hazard placement does not require pixel precision.

### Hazard Orbit

Targets surround one or more black holes.

Validation:

- Multiple gesture solutions exist.
- Full-body collision remains readable.

### Delayed Catch

A target is easiest to collect on a later repeat of the gesture.

Validation:

- The repeated pattern is understandable.
- The line does not need to survive too long before success.

### Wide Sweep

Targets reward broad, elegant gesture movement.

Validation:

- Horizontal escape pressure is fair.
- Mobile input has enough room.

### Tight Cluster

Targets are near one another with hazards nearby.

Validation:

- Hit radii remain generous.
- Hazards are not visually confusing.

## Future Mechanic Prototypes

These are prototypes only until they pass validation.

### Moving Targets

Targets move slowly while the line repeats.

Risk:

- Can make competition and validation harder.

### Moving Hazards

Black holes move on deterministic paths.

Risk:

- Can feel unfair if motion is not readable.

### Wind Field

A zone offsets the moving line's trajectory.

Risk:

- Can make the core gesture feel less trustworthy.

### Gravity Well

A zone pulls the moving line slightly.

Risk:

- Can obscure why collision happened.

### Portals

The moving line exits one portal and enters another.

Risk:

- Can require explanation if visual language is weak.

## Generator Improvements

Add:

- Archetype weighting.
- Difficulty bands.
- Layout rejection reasons.
- Seed preview tool.
- Batch generation test.
- Difficulty metadata.

Generator should answer:

- Is this layout fair on mobile?
- Does it invite multiple gesture solutions?
- Does it require living-line reasoning?
- How long should an average player need?
- Does it fit the intended difficulty band?
- Does it duplicate a recent layout too closely?

## Difficulty Simulation

Create a dev-only script or screen that:

- Generates many daily seeds.
- Samples first 20 puzzles per seed.
- Reports target/hazard distribution.
- Reports rejected layout count.
- Reports estimated difficulty curve.
- Flags impossible, too-dense, or too-similar layouts.

## Content Quality Bar

Every new mechanic or layout must be:

- Learnable without text.
- Solvable in 1-5 seconds.
- Compatible with touch.
- Deterministic.
- Server-validatable.
- Replayable.
- Visually readable on mobile.
- Clearly based on living gesture locomotion.

## Implementation Tasks

### 1. Generator Refactor

- Separate archetype selection from layout creation.
- Add difficulty band config.
- Add rejection diagnostics.

### 2. Add Layout Archetypes

- Implement Bounce Weave.
- Implement Hazard Orbit.
- Implement Delayed Catch.
- Implement Wide Sweep.
- Implement Tight Cluster.

### 3. Add Future Mechanic Sandbox

- Add disabled-by-default prototype flags.
- Keep prototypes out of official daily runs until validated.
- Document deterministic simulation requirements.

### 4. Add Dev Simulation

- Batch-generate seeds.
- Print stats.
- Save failing seeds for debugging.

### 5. Tune Daily Curve

- Adjust first 10 layout distribution.
- Ensure first puzzle is always easy.
- Ensure expert layouts do not appear too early.

## Milestone Build

At the end of Phase 4, a user can:

```text
Play multiple days
See varied target/hazard layouts
Use living-line reasoning in every puzzle
Experience smoother difficulty progression
Watch replays that remain understandable
```

## Validation Checklist

- [ ] Generator can batch-create many seeds without impossible layouts.
- [ ] Layout distribution is varied.
- [ ] Difficulty curve is smooth.
- [ ] Every enabled layout uses the living-line mechanic.
- [ ] Server validation still matches client behavior.
- [ ] Replay viewer supports expanded layouts.
- [ ] Mobile readability remains strong.
- [ ] Disabled future mechanics cannot enter ranked daily play accidentally.

## Acceptance Criteria

Phase 4 is complete when content variety improves without weakening the living-gesture clarity of the game.

## Risks

### New Mechanics Reduce Clarity

Mitigation:

Gate every mechanic against the living-line design rules. Remove mechanics that need text instructions.

### Generator Becomes Hard to Debug

Mitigation:

Log rejection reasons and keep failing seeds reproducible.
