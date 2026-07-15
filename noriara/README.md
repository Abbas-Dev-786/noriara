# Noriara

Noriara is a daily gesture puzzle game played inside Reddit. Draw one continuous line, release it, and watch the line move through the board. Collect every colored target, avoid black hazards, and solve as many boards as possible before time expires.

## Who It Is For

- Redditors who want a short daily skill challenge.
- Communities that want a shared game and leaderboard.
- Moderators who want to add an interactive game post without managing external hosting.

## How To Play

1. Open a Noriara post and select **Start**.
2. Choose **Official Run** or **Practice**.
3. Draw one continuous line on the board.
4. Release the line to make it move.
5. Collect every colored target while avoiding black hazards.
6. Continue solving boards until the 30-second timer ends.

The top and bottom edges bounce the moving line. Leaving through the left or right edge fails the current board when targets remain. A failed board resets without ending the full run.

## Daily Runs

- Every UTC day uses the same deterministic puzzle sequence for all players.
- A logged-in player can submit one official run per UTC day.
- Practice runs are always available and do not change the leaderboard.
- Logged-out users can play practice runs but cannot submit official scores.
- The server replays submitted movement data before accepting an official score.

## Scores And Leaderboards

- Solving a board awards points.
- Faster solves and consecutive solves increase the score.
- Accepted official runs appear on the daily leaderboard.
- Player statistics include current streak, longest streak, best score, best rank, highest puzzle reached, total official runs, and total puzzles solved.

## Replays

- Players can watch their own accepted replay while it is retained.
- Replays from top leaderboard entries may be available to other players.
- Replay controls include play, pause, restart, and timeline seeking.
- Daily run metadata and replay data are retained for 30 days.

## Other Game Modes

### Weekly Events

When an event is active, an event button appears on the home screen. Events can use a different timer, puzzle count, seed, and leaderboard from the daily run.

### Community Layouts

Logged-in players can submit a title, optional note, and seed for moderator review. Approved layouts appear in the curated layout list and run in practice mode only. Community layouts never affect the official daily leaderboard.

### Archives

Archived daily leaderboards appear under **Leaderboard > Past Archives** after an archive has been created by the app's live-operations workflow.

## Accessibility And Feedback

The settings screen includes:

- Sound on or off.
- Haptics on or off where supported.
- Reduced motion.
- High contrast.

## Moderator Instructions

No app configuration is required for the core daily game.

- Installing the app creates an initial Noriara post in the community.
- To create another post, open the subreddit moderator menu and select **Create a new post**.
- To create or update an event, select **Configure Noriara event**, enter its ID, dates, seed, timer, and puzzle count, then leave **Activate this event** enabled to publish it immediately.
- To stop an event without deleting its saved configuration, select **Deactivate Noriara event**.
- Daily leaderboard archives are created automatically at 00:05 UTC. The protected `POST /api/admin/archive-yesterday` endpoint remains available for a moderator retry or backfill.
- Live-operations and community-layout administration requires the moderator account to have Reddit's **Config** permission (or full permissions) for the subreddit.
- The app uses Reddit identity for official runs and Devvit Redis for game data.

## Data Use

Noriara stores only data required to operate the game:

- Reddit usernames associated with official scores, statistics, and replays.
- Daily and event leaderboard entries.
- Official run validation data.
- Community layout submissions and moderation state.
- Local browser settings and local best scores.

Gameplay data is stored with Devvit Redis. Noriara does not use an external gameplay API or external analytics service.

## Development

Requires Node.js 22.2 or newer.

- `npm run dev`: Start Devvit playtest mode.
- `npm run build`: Build client and server bundles.
- `npm run lint`: Run ESLint.
- `npm run test`: Run type-checking and shared validation tests.
- `npm run deploy`: Type-check, lint, and upload a private test version.
- `npm run launch`: Type-check, lint, and publish a patch version for review.
- `npm run simulate:puzzles`: Generate 3,000 puzzles across 100 seeds and report content-quality diagnostics.

## Launch

Complete Reddit playtest verification on mobile and web before publishing. Test with developer, moderator, and regular-user accounts.

1. Authenticate with `npm run login`.
2. Confirm the active account with `npx devvit whoami`.
3. Run `npm run test`, `npm run lint`, `npm run build`, and `npm run simulate:puzzles`.
4. Run `npm run dev`.
5. Verify the splash screen, expanded game, official run, practice fallback, leaderboard, stats, replay, settings, community layouts, active events, archives, and moderator post creation.
6. Publish an unlisted patch release with `npm run launch -- --bump patch`.

Use `npm run launch -- --bump minor` or `npm run launch -- --bump major` when appropriate. To publish a specific stable version, use `npm run launch -- --version 1.0.1`.

Noriara is a game, so the default unlisted publish mode is recommended. Use `npm run launch -- --public` only if the app should be listed for installation by moderators of any community.
