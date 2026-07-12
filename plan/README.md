# Daily Line Planning Index

This folder contains the implementation plan for building Daily Line from MVP to the complete product described in the PRD and GDD documents.

## Planning Documents

- [Master Plan](./MASTER_PLAN.md)
- [Technical Architecture](./TECHNICAL_ARCHITECTURE.md)
- [Phase 0 - Foundation](./PHASE-0-FOUNDATION.md)
- [Phase 1 - MVP Daily Run](./PHASE-1-MVP-DAILY-RUN.md)
- [Phase 2 - Competitive Loop](./PHASE-2-COMPETITIVE-LOOP.md)
- [Phase 3 - Retention and Polish](./PHASE-3-RETENTION-POLISH.md)
- [Phase 4 - Content Expansion](./PHASE-4-CONTENT-EXPANSION.md)
- [Phase 5 - Community and Live Ops](./PHASE-5-COMMUNITY-LIVE-OPS.md)
- [Decision Log](./DECISION_LOG.md)

## Build Principle

Each phase ends with a working milestone that can be opened, played, and validated before the next phase starts.

The project should not move to a later phase until the current milestone is playable and its acceptance checklist is complete.

## Current Status

Current implementation status is `Phase 3 closeout`.

What this means:

- Phase 0 foundation is complete.
- Phase 1 local gameplay loop is complete.
- Phase 2 official competition loop is complete.
- Phase 3 features are mostly implemented, but the acceptance gate is still open.

The next gate is not Phase 4 feature work yet. The next gate is to close Phase 3 with:

- Devvit playtest verification of official runs, leaderboard, stats, replay access, and expanded-mode flow.
- Replay fidelity verification against submitted telemetry.
- Mobile and accessibility QA for reduced motion, high contrast, sound, and haptics.
- UI cleanup for any copy, encoding, or presentation defects found during QA.

Only after those checks pass should the project move into Phase 4 content expansion.
