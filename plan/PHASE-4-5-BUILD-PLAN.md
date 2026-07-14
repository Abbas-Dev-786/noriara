# Phase 4 and Phase 5 Build Plan

## Goal

Complete Phase 4 content expansion and Phase 5 community/live-ops without weakening the core daily ranked game.

The build should preserve three invariants:

- Daily ranked play remains deterministic, server-validatable, and replayable.
- New mechanics enter ranked daily only after simulation and replay validation.
- Community content stays manually curated until moderation, reporting, and rollback tools are proven.

## Current Starting Point

Phase 3 has the core retention loop:

- Daily seed and official run lifecycle.
- Server-validated submissions.
- Leaderboard and player stats.
- Replay storage and replay viewer.
- Accessibility settings and mobile-oriented UI.
- Explicit daily-only run variant in the API.

Remaining Phase 3 dependency before release-grade Phase 4/5 work:

- Devvit logged-in playtest for official run, replay access, stats, and leaderboard update.

## Execution Strategy

Build in six milestones:

1. Phase 4A: Generator architecture and diagnostics.
2. Phase 4B: Content variety and difficulty simulation.
3. Phase 4C: Mechanic sandbox, replay, and validation hardening.
4. Phase 5A: Archives and live-ops foundation.
5. Phase 5B: Weekly event mode and season config.
6. Phase 5C: Community layout submission, moderation, and curation.

Each milestone must pass:

- `npm run test`
- `npm run lint`
- `npm run build`
- deterministic seed regression tests
- client/server replay fidelity checks for any changed gameplay behavior

## Phase 4A - Generator Architecture

### Objective

Make puzzle generation easier to tune, debug, and validate before adding more content.

### Build Tasks

- Split `src/shared/puzzle.ts` into focused generator modules:
  - archetype registry
  - difficulty band config
  - layout builders
  - layout validation
  - diagnostics and metadata
- Keep public `generatePuzzlesForSeed(seed, count, diagnostics)` stable unless a migration is needed.
- Add explicit generator version metadata to puzzle layouts.
- Add rejection diagnostics with stable reason codes.
- Add reusable validation helpers for:
  - bounds
  - target spacing
  - hazard spacing
  - target/hazard separation
  - safe mobile radii
  - band complexity limits
  - living-line compatibility
- Add tests proving the same seed produces the same puzzle ids, geometry, metadata, and diagnostics.

### Acceptance Gate

- Existing daily runs validate unchanged or with an intentional generator version bump.
- Generator diagnostics identify rejection-heavy seeds.
- No disabled mechanic can appear in official daily output.

## Phase 4B - Content Variety and Difficulty Simulation

### Objective

Increase target/hazard variety while keeping every puzzle readable and fair on mobile.

### Build Tasks

- Implement or tune these archetypes:
  - Open Sweep
  - Wide Sweep
  - Bounce Weave
  - Hazard Orbit
  - Delayed Catch
  - Tight Cluster
- Add archetype weights per difficulty band.
- Tune the first 10 puzzles:
  - puzzle 0 is always tutorial/simple
  - puzzles 1-2 are easy
  - puzzles 3-6 introduce medium density
  - puzzles 7-14 introduce hard layouts
  - later puzzles can use expert layouts
- Expand `tools/simulate-puzzles.mjs` into a quality report:
  - seed count
  - puzzle count
  - archetype distribution
  - band distribution
  - average targets/hazards
  - rejection counts
  - fallback counts
  - suspicious seeds
  - repeated-shape warnings
- Save output to ignored `.tmp-simulation/`.
- Add a deterministic seed fixture list for known-good and known-bad seeds.

### Acceptance Gate

- Batch simulation over at least 1,000 seeds has:
  - zero impossible generated layouts by validation rules
  - near-zero fallback layouts
  - no tutorial puzzle with hazards
  - no early puzzle with expert density
- Replay viewer still reconstructs all enabled archetypes.
- Official validation accepts honest telemetry for expanded layouts and rejects mutated telemetry.

## Phase 4C - Mechanic Sandbox

### Objective

Create disabled-by-default future mechanic plumbing without letting prototypes leak into ranked daily play.

### Build Tasks

- Add a `mechanics` config model:
  - `core`
  - `movingTargets`
  - `movingHazards`
  - `windField`
  - `gravityWell`
  - `portals`
- Keep all non-core mechanics disabled for daily ranked mode.
- Add `runVariant` support for future variants without enabling them:
  - `daily`
  - `event`
  - `practiceSandbox`
- Gate server submission validation by variant and enabled mechanics.
- Extend replay format so every mechanic-affecting state is serialized deterministically.
- Add prototype-only builders behind dev flags.
- Add tests that prove disabled mechanics are rejected in daily submissions and replay data.

### Acceptance Gate

- Daily ranked generation emits only `core` mechanics.
- Non-core prototypes can be simulated in dev-only paths.
- Official submit and replay reject unsupported mechanic metadata.
- No UI entrypoint exposes prototype mechanics to players yet.

## Phase 5A - Archives and Live-Ops Foundation

### Objective

Create the persistent operational layer needed before events and community content.

### Build Tasks

- Add archived daily summaries:
  - date
  - top scores
  - top replay availability
  - winner username
  - generated seed
  - generator version
- Add archive Redis keys:
  - `archive:daily:{date}:summary`
  - `archive:daily:{date}:leaderboard`
  - `archive:daily:index`
- Add `/api/archive` and `/api/archive/:date`.
- Add client archive view from leaderboard.
- Add live-ops config keys:
  - disabled dates
  - overridden seeds
  - featured layout ids
  - season id
  - event config id
- Add admin/dev scripts:
  - preview seed
  - inspect replay
  - archive yesterday
  - disable bad seed
  - set seed override

### Acceptance Gate

- Yesterday/archive leaderboard can be viewed without affecting today.
- Seed preview uses the same generator code as gameplay.
- Bad seed override is explicit, logged, and test-covered.

## Phase 5B - Weekly Events and Seasons

### Objective

Add separate event competition and season config while keeping daily ranked primary.

### Build Tasks

- Add event data model:
  - event id
  - event date range
  - event seed
  - timer length
  - puzzle count
  - allowed mechanics
  - leaderboard key
  - archive key
- Add event Redis keys:
  - `event:{eventId}:config`
  - `event:{eventId}:leaderboard`
  - `event:{eventId}:runs:{username}`
  - `event:{eventId}:replay:self:{username}`
  - `event:{eventId}:replay:public:{username}`
- Extend API routes:
  - `GET /api/event/current`
  - `POST /api/event/start`
  - `POST /api/event/submit`
  - `GET /api/event/leaderboard`
  - `GET /api/event/replay/:username`
- Keep event validation separate from daily validation.
- Add UI entrypoint only when an active event config exists.
- Add season config:
  - season id
  - label
  - active date range
  - allowed mechanics by variant
  - display theme metadata
- Keep seasonal mechanics limited to practice/event until explicitly promoted.

### Acceptance Gate

- Daily run and event run can both exist for the same user/date without key collisions.
- Event replay reconstructs event puzzles and timer rules faithfully.
- Daily leaderboard is unaffected by event submissions.
- Event UI does not appear when no active event exists.

## Phase 5C - Community Layout Submission and Curation

### Objective

Build a manual curation pipeline for community layouts without auto-publishing user content.

### Build Tasks

- Add community layout schema:
  - layout id
  - submitter username
  - title
  - note
  - targets
  - hazards
  - createdAt
  - status: `submitted`, `rejected`, `approved`, `featured`, `retired`
  - rejection reason
  - validator diagnostics
- Add validation:
  - geometry bounds
  - minimum/maximum target count
  - maximum hazard count
  - safe spacing
  - title/note length
  - profanity/abuse placeholder checks
  - deterministic replay compatibility
- Add API routes:
  - `POST /api/community/layouts`
  - `GET /api/community/layouts/mine`
  - `GET /api/admin/community/layouts`
  - `POST /api/admin/community/layouts/:id/approve`
  - `POST /api/admin/community/layouts/:id/reject`
  - `POST /api/admin/community/layouts/:id/retire`
- Add simple submission UI:
  - coordinate form or minimal editor
  - preview canvas
  - validation errors
  - submit confirmation
- Add admin curation UI or scripts:
  - list pending
  - preview layout
  - approve/reject with reason
  - feature in event/practice only
- Add rate limit keys:
  - `community:layoutSubmit:{date}:{username}`
- Do not add voting until manual curation is stable.

### Acceptance Gate

- Invalid layouts are rejected with clear reasons.
- Approved layouts can be previewed and featured in non-daily contexts.
- Retired layouts cannot appear in future events.
- User-submitted content never enters ranked daily automatically.

## Cross-Cutting Engineering Work

### Data Safety

- Prefix keys by variant: daily, event, archive, community.
- Include generator version and mechanic set in replay data.
- Keep replay validation backward-compatible or provide migration guards.
- Add TTLs only where data is intentionally temporary.
- Archive summaries should not depend on expiring run metadata.

### Testing

- Add shared tests for:
  - generator determinism
  - archetype validation
  - mechanic gating
  - daily/event key separation
  - replay reconstruction by variant
  - archive route serialization
  - community layout validation
- Add server route tests if practical with Devvit mocks.
- Add simulation snapshots for representative seeds.

### QA

- Desktop and mobile smoke test:
  - daily official run
  - practice run
  - replay
  - archive view
  - event start/submit
  - community layout preview
  - settings and high contrast
- Verify no UI overlap on:
  - splash
  - game
  - results
  - leaderboard
  - archive
  - event
  - community submission
  - admin/curation screens

## Recommended Build Order

1. Refactor generator into modules without behavior change.
2. Add diagnostics and simulation reports.
3. Tune and test expanded archetypes.
4. Add mechanic gating and replay metadata.
5. Add archive storage and archive UI.
6. Add live-ops seed preview and bad-seed override.
7. Add event config and separate event run lifecycle.
8. Add event UI, leaderboard, and replay.
9. Add season config.
10. Add community layout validation and storage.
11. Add submission UI.
12. Add admin curation tools.
13. Run full QA and close Phase 4/5 acceptance checklists.

## Completion Definition

Phase 4 is complete when:

- Content variety is measurably better across simulated seeds.
- The difficulty curve is smooth.
- Daily ranked output remains core-only, deterministic, validated, and replayable.

Phase 5 is complete when:

- Archives exist.
- Weekly events run separately from daily.
- Season config can gate mechanics.
- Community layouts can be submitted, validated, manually approved, featured, and retired.
- Live-ops tools can preview seeds and disable bad content.
