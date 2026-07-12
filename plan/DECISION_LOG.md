# Decision Log

## Confirmed Decisions

### Use Devvit Web

Daily Line will be built as a Devvit Web app so it can use familiar web technologies and run natively inside Reddit.

### Use Phaser 3 for Gameplay

Phaser will handle gesture drawing, pointer input, living-line locomotion, puzzle rendering, animations, collision feedback, and replay playback.

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

### Current Delivery Gate Is Phase 3 Closeout

Default:

Treat the project as being in late Phase 3 rather than starting Phase 4 immediately.

Reason:

The codebase already includes official runs, leaderboard flows, replay storage/viewing, player stats, and accessibility settings. The highest-value next work is validating and polishing those systems in Devvit playtest before expanding generator scope.

### Phase 1 Uses Only Targets and Black Holes

Default:

Phase 1 puzzles contain colored target circles, black hazard circles, top/bottom bounce boundaries, and left/right escape boundaries.

Reason:

This keeps the MVP aligned with the living-gesture mechanic and avoids drifting into generic path-drawing puzzles.

### Start/Goal and Connect Templates Are Excluded From Phase 1

Default:

No start nodes, goal nodes, Connect puzzles, Cover puzzles, or Efficiency route objectives in Phase 1.

Reason:

The canonical objective is always to collect all colored circles while avoiding black holes with a repeated moving gesture.

### Dynamic Obstacles Are Deferred

Default:

No moving obstacles in Phase 1.

Reason:

Moving targets or hazards complicate fairness, validation, and replay determinism.

### Precision Difficulty Is Avoided

Default:

Difficulty increases through target/hazard layout, repeated-motion planning, bounce usage, and puzzle density, not tiny hitboxes.

Reason:

This matches the GDD and makes the game fair on mobile.

## Open Questions

1. Should the final product keep one official run per day, or allow multiple attempts with best score?
2. Should practice mode be available before the official run, after the official run, or both?
3. Should replay viewing unlock only after submitting today's run?
4. Should the leaderboard show Reddit usernames publicly or use a privacy-preserving display name?
5. Should ties prioritize fastest final submission time, fewer failed attempts, or shortest total solve time?
6. Should practice mode use the same daily seed, random seeds, or both?
