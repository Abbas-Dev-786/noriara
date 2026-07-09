# Phase 5 - Community and Live Ops

## Goal

Expand Daily Line from a daily game into a Reddit community experience.

This phase ends when the app supports community-influenced content, scheduled events, and live operations workflows.

## Why This Phase Exists

The full product vision includes community progression, submitted puzzles, weekly events, and seasonal mechanics. These systems should be added only after the daily core loop works.

## Scope

### Included

- Weekly event mode.
- Monthly or seasonal mechanic framework.
- Community puzzle submission prototype.
- Puzzle moderation workflow.
- Community voting or curation.
- Archived leaderboards.
- Live operations calendar.
- Admin/dev tools.
- Content retirement policy.

### Not Included

- Pay-to-win systems.
- Loot boxes.
- Energy systems.
- Mandatory grind.

## Weekly Events

Example:

Every Sunday, run a Community Championship.

Rules:

- Longer timer or harder puzzle sequence.
- Separate leaderboard.
- Archive top scores.
- Optional badge or profile stat.

## Seasons

Season rule:

Each season introduces exactly one new mechanic.

Example sequence:

- Season 1: Core Geometry.
- Season 2: Motion.
- Season 3: Reflection.
- Season 4: Portals.
- Season 5: Gravity.

Season mechanics must remain optional in the generator until proven fair.

## Community Puzzle System

### Submission

Players can submit:

- Puzzle layout.
- Title.
- Optional note.

### Validation

Submitted puzzles must pass:

- Geometry validation.
- Solvability validation.
- Mobile readability validation.
- Abuse/moderation checks.

### Curation

Options:

- Developer pick.
- Community voting.
- Moderator approval.
- Auto-feature only after validation.

Recommended first version:

Manual curation only.

## Community Progression

Future system:

Subreddit progress increases as users solve daily puzzles.

Example:

```text
Daily solves
Community meter fills
New theme unlocks
Next weekly event changes
```

This should be cosmetic or content-based only. It must not affect competitive fairness.

## Live Operations Tools

Needed tools:

- Preview tomorrow's seed.
- Force-disable bad seed.
- Replace daily seed if severe issue found before launch.
- View leaderboard anomalies.
- View replay reports.
- Archive daily winners.
- Feature curated puzzle.

## Moderation and Safety

Community submissions need:

- Rate limits.
- Report flow.
- Admin review.
- Rejection reasons.
- Abuse prevention.

Do not allow user-generated content to become required for the main daily challenge until moderation is strong.

## Implementation Tasks

### 1. Archive Leaderboards

- Store daily winners.
- Add yesterday/archive view.
- Add top historical run summaries.

### 2. Weekly Event Mode

- Add event config.
- Add separate event leaderboard.
- Add UI entry point.
- Add server scheduler support if needed.

### 3. Seasonal Framework

- Add mechanic flags.
- Add season config.
- Add generator support for enabled mechanics.

### 4. Community Submission Prototype

- Add puzzle editor or simple submission format.
- Add server validation.
- Store submitted puzzles.
- Add admin approval state.

### 5. Voting or Curation

- Add curated queue.
- Add voting only after moderation basics work.

### 6. Live Ops Admin Tools

- Add development/admin-only views or scripts.
- Add seed preview.
- Add anomaly review.

## Milestone Build

At the end of Phase 5, the product supports:

```text
Daily challenge
Archived results
Weekly event
Season config
Community puzzle submissions
Manual curation
Live ops seed preview
```

## Validation Checklist

- [ ] Archived leaderboard can be viewed.
- [ ] Weekly event can run separately from daily run.
- [ ] Season config can enable/disable a mechanic.
- [ ] Community puzzle can be submitted.
- [ ] Invalid community puzzle is rejected.
- [ ] Curated puzzle can be approved.
- [ ] Admin can preview seeds.
- [ ] Bad content can be removed or disabled.

## Acceptance Criteria

Phase 5 is complete when Daily Line has a sustainable live content pipeline beyond fully automated daily seeds.

## Risks

### Community Content Creates Moderation Burden

Mitigation:

Start with manual curation. Do not auto-publish submissions.

### Events Fragment Competition

Mitigation:

Keep the daily run as the primary mode. Events should supplement, not replace, the daily habit.

### Seasonal Mechanics Break Fairness

Mitigation:

Test new mechanics in practice or event modes before adding them to daily ranked play.

