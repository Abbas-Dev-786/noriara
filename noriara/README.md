# Noriara

Noriara is a daily Reddit puzzle game built with Devvit Web. Players trace a launch path, then watch the snake-like line replay through a puzzle board to collect targets, avoid hazards, and post one official leaderboard run per day.

## Gameplay

- Each UTC day generates a deterministic seed and puzzle set.
- Logged-in users can start one official run for that day; everyone else plays in practice mode.
- Official submissions include telemetry that the server re-simulates before accepting a score.
- Accepted runs update the daily leaderboard, player streak stats, and replay storage.

## Runtime Behavior

- `GET /api/bootstrap`: Returns the current daily seed, puzzles, leaderboard preview, and the viewer's submission state.
- `POST /api/run/start`: Issues an official run token for logged-in users who have not submitted yet.
- `POST /api/run/submit`: Validates telemetry, enforces submission time limits, updates leaderboard/stats, and stores replay data.
- `GET /api/leaderboard`, `GET /api/stats`, `GET /api/replay/:username`: Read leaderboard, player stats, and replay data.
- `POST /internal/menu/post-create`: Moderator action that creates a new interactive post in the current subreddit.
- `POST /internal/menu/example-form`: Moderator action that opens a sample form wired to `/internal/form/example-submit`.

## Permissions

`devvit.json` explicitly enables:

- `redis`: Used for official run tokens, leaderboard state, replay storage, per-user stats, and the starter counter endpoints.
- `reddit`: Used for identity lookup (`getCurrentUsername`) and moderator post creation (`submitCustomPost`).

## Storage Model

- Daily leaderboard: `daily:{date}:leaderboard`
- Run metadata: `daily:{date}:runs:{username}`
- Official run token: `officialRun:{date}:{username}`
- Personal/public replay cache: `daily:{date}:replay:*`
- Player stats: `playerStats:{username}`
- Starter counter state: `post:{postId}:count`

## Development

Requires Node 22.2+.

- `npm run dev`: Start Devvit playtest mode
- `npm run build`: Build client and server bundles
- `npm run lint`: Run ESLint
- `npm run test`: Run type-checking plus shared validation tests
- `npm run deploy`: Type-check, lint, then upload a new app version
- `npm run launch`: Deploy and publish for review

## Review Notes

- The app does not use external HTTP fetch domains.
- Leaderboard submissions are time-bound to the server-issued run token and capped before expensive validation work.
- Replays are stored only when they pass replay-size validation.
