# Phase 3 Closeout Checklist

## Goal

Close the current implementation gap between "Phase 3 mostly built" and "Phase 3 accepted".

## Why This Exists

The codebase already contains most of the systems described in Phase 3, but the remaining work is validation and polish rather than new product scope.

Phase 4 should not begin until this closeout checklist is complete.

## Current Assessment

- Official run lifecycle exists.
- Leaderboard exists.
- Stats and streak tracking exist.
- Replay storage and replay viewer exist.
- Accessibility settings exist.
- Shared tests pass locally.

## Closeout Work

### 1. Devvit Playtest Verification

- Verify splash to expanded-game launch flow.
- Verify official run start and submit flow with a logged-in user.
- Verify practice-mode fallback when official run is unavailable.
- Verify leaderboard rank and preview after accepted submission.
- Verify stats update after accepted official submission.
- Verify replay availability rules for self and public top entries.

### 2. Replay Fidelity Verification

- Compare replay viewer output against submitted telemetry for representative successful and failed runs.
- Confirm target collection timing is credible.
- Confirm failure outcome timing is credible.
- Confirm later puzzles render correctly after earlier solves/failures.

### 3. Accessibility and Mobile QA

- Verify reduced motion visibly reduces pulses, shake, and flashes.
- Verify high contrast produces stronger gameplay readability.
- Verify sound toggle disables tones.
- Verify haptics toggle disables vibration where supported.
- Verify portrait/mobile layout has no overlapping UI on splash, game, results, leaderboard, stats, settings, and replay screens.

### 4. UI Cleanup

- Remove visible mojibake or bad icon glyphs.
- Fix any copy inconsistencies discovered during playtest.
- Fix any layout or presentation defects discovered during playtest.

## Exit Criteria

Phase 3 is closed when:

- Playtest confirms the full official daily loop works end to end.
- Replay viewer is trustworthy enough to support competitive comparison.
- Accessibility controls behave as advertised.
- Mobile presentation is stable.
- No visible encoding or obvious polish defects remain in the primary user journey.

## Next Phase After Closeout

Begin Phase 4 content expansion:

- generator refactor
- difficulty simulation
- archetype expansion
- deterministic content-quality checks
