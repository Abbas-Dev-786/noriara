# Decision Log

## Confirmed Decisions

### Use Devvit Web

Daily Line will be built as a Devvit Web app so it can use familiar web technologies and run natively inside Reddit.

### Use Phaser 3 for Gameplay

Phaser will handle drawing, pointer input, puzzle rendering, animations, and replay playback.

### Use React for Screens

React will handle non-game UI: home, results, leaderboard, replay controls, settings, and app shell.

### Use TypeScript

TypeScript will be used across client, server, and shared logic.

### Use UTC Daily Reset

Daily challenge resets use UTC dates.

### Keep Phase 1 Small

Phase 1 focuses on the playable daily run only. Leaderboards and full server validation start in Phase 2.

## Default Decisions Requiring Final Product Confirmation

These are selected defaults for planning. They can be changed before implementation if needed.

### One Official Run Per Day

Default:

Each logged-in user gets one official leaderboard submission per UTC day.

Reason:

This creates stronger tension and fairness for a daily competitive game.

Alternative:

Allow unlimited attempts and keep the best score. This is more casual but less intense.

### Logged-Out Users Can Practice Only

Default:

Logged-out users can play locally but cannot submit official leaderboard scores.

Reason:

Server-side identity is required for fair ranking and streaks.

### MVP Replay Scope Is Limited

Default:

Store and show top 10 daily replays plus the current user's own replay.

Reason:

Replay data can grow quickly.

### Dynamic Obstacles Are Deferred

Default:

No moving obstacles in Phase 1.

Reason:

Moving obstacles complicate fairness, validation, and replay determinism.

### Precision Difficulty Is Avoided

Default:

Difficulty increases through route planning and puzzle complexity, not tiny hitboxes.

Reason:

This matches the GDD and makes the game fair on mobile.

## Open Questions

1. Should the final product keep one official run per day, or allow multiple attempts with best score?
2. Should practice mode be available before the official run, after the official run, or both?
3. Should replay viewing unlock only after submitting today's run?
4. Should the leaderboard show Reddit usernames publicly or use a privacy-preserving display name?
5. Should ties prioritize fastest final submission time, fewer failed attempts, or shortest total solve time?

