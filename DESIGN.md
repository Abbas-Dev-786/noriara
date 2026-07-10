# Design System - Daily Line

## Product Context
- **What this is:** A Reddit-native daily gesture puzzle where the player draws one line, releases it, and watches that gesture repeat as a living moving body.
- **Who it's for:** Puzzle players who like quiet mastery, daily rituals, and expressive but readable mechanics.
- **Space/industry:** Mobile-first puzzle game, daily challenge loop, replayable competitive play.
- **Project type:** Interactive game shell with HUD, overlays, leaderboard, replay, and settings.

## Aesthetic Direction
- **Direction:** Minimal Japanese editorial game UI.
- **Decoration level:** Intentional and restrained.
- **Mood:** Calm, composed, tactile, and elegant. It should feel like paper, ink, and deliberate motion rather than a glowing arcade cabinet.
- **Visual cues:** Washi-paper surfaces, sumi-ink typography, muted vermilion accents, moss and brass support tones, generous negative space.

## Typography
- **Display/Hero:** `Zen Old Mincho` - literary, graceful, and sharp enough for titles without feeling ornamental.
- **Body:** `Zen Kaku Gothic New` - clean, modern, readable on mobile, and compatible with a Japanese-inspired system.
- **UI/Labels:** `Zen Kaku Gothic New` uppercase with high tracking for metadata and compact controls.
- **Data/Tables:** `IBM Plex Mono` - tabular numerals and scoreboard clarity.
- **Code:** `IBM Plex Mono`.
- **Loading:** Google Fonts in the HTML entrypoints.
- **Scale:** 12 / 14 / 16 / 20 / 24 / 32 / 44 / 56.

## Color
- **Approach:** Restrained and warm.
- **Primary:** `#A04F37` - muted vermilion for action and focal states.
- **Secondary:** `#667863` - moss green for success and progression.
- **Neutrals:** `#FBF8F2`, `#F4EFE5`, `#E8E1D4`, `#BFB4A4`, `#5C5246`, `#29231D`.
- **Semantic:** success `#667863`, warning `#B09148`, error `#8B3F2D`, info `#6F7F86`.
- **Dark mode:** Not a priority. Prefer one highly tuned light theme over a generic dual-mode system.

## Spacing
- **Base unit:** 8px.
- **Density:** Comfortable with deliberate breathing room.
- **Scale:** 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64.

## Layout
- **Approach:** Hybrid editorial plus game dashboard.
- **Grid:** Single column on mobile, split content panels at tablet/desktop, never more than two strong columns in the core gameplay shell.
- **Max content width:** 1440px outer shell, 960px-1120px for most overlays.
- **Border radius:** 18 / 22 / 26 / 30, with full radius reserved for buttons and pills.

## Motion
- **Approach:** Subtle, elegant, and useful.
- **Easing:** `cubic-bezier(0.2, 0.8, 0.2, 1)` for entrances, `ease-out` for hover, `ease-in-out` for state shifts.
- **Duration:** 160ms hover, 320-420ms screen/overlay entrances, no aggressive looping motion.
- **Rules:** Motion should guide attention, never compete with gameplay.

## UX Principles
- Keep the game canvas visually dominant.
- Avoid centered piles of equal-weight buttons and cards.
- Each screen needs a clear first action, clear secondary actions, and a readable explanation.
- Stats and leaderboard should feel archival and calm, not flashy.
- Mobile readability is mandatory; titles may feel literary, but controls must stay plain and obvious.

## Asset Guidance
- Required assets: none for MVP.
- Useful optional assets: one subtle paper texture, one minimalist divider or seal mark, and a restrained icon set if the UI later expands.
- Avoid: mascots, neon glows, fantasy gradients, decorative clutter, or game art that fights the line mechanic.

## Decisions Log
| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-07-10 | Shifted to a muted paper-and-ink system | The prior neon styling felt generic and disconnected from the intended calm mastery loop. |
| 2026-07-10 | Selected Mincho + Kaku Gothic + Plex Mono | The game needs elegance for titles, clarity for controls, and stable numbers for score-heavy UI. |
