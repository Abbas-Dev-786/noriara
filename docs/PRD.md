# Product Requirements Document (PRD)

---

# Project Name

**Daily Line** *(Working Title)*

> One Line. One Run. One Chance.

Version: 1.0 (Phase 1 MVP)

Status: Draft

Owner: Product Team

Platform:
- Reddit Devvit
- Devvit Web
- Phaser 3

---

# 1. Vision

Build the most replayable daily puzzle game on Reddit.

Players return every day to compete in a new 30-second challenge where they solve an endless sequence of single-stroke puzzles that increase in difficulty.

The game is designed around three principles:

- Instant to understand
- Difficult to master
- Impossible to perfect

Every day is a fresh competition.

---

# 2. Problem Statement

Most Reddit games are fun once.

Very few become habits.

Players need a reason to return tomorrow.

The game should create anticipation through:

- New daily puzzles
- Global competition
- Increasing mastery
- Daily leaderboards
- Personal improvement

---

# 3. Product Goal

Create a daily ritual.

Target player behavior:

Morning

↓

Open Reddit

↓

Play Daily Line

↓

Compare score

↓

Check leaderboard

↓

Return tomorrow

---

# 4. Success Metrics

## Primary KPI

Daily Active Users (DAU)

---

## Secondary KPIs

Daily Retention (D1)

Weekly Retention (D7)

Average Session Length

Average Puzzles Solved

Average Daily Attempts

Leaderboard Participation

Replay Views

---

## MVP Success

- 1,000+ Daily Plays
- >35% D1 Retention
- Average Session >40 sec
- 80% Puzzle Completion Rate
- <2 sec Loading Time

---

# 5. Target Audience

## Primary

Puzzle lovers

Examples

- Blek
- Monument Valley
- Railbound
- Euclidean Lands
- Klocki

---

## Secondary

Competitive players

Players who enjoy

- Daily challenges
- Speedrunning
- Leaderboards
- Personal bests

---

## Tertiary

Casual Reddit users

Looking for

30-second entertainment

---

# 6. Product Pillars

## Pillar 1

Elegant

One mechanic.

Infinite possibilities.

---

## Pillar 2

Competitive

Everyone solves the same challenge.

---

## Pillar 3

Replayable

Every day is different.

---

## Pillar 4

Fair

Skill only.

No randomness during gameplay.

---

## Pillar 5

Beautiful

Minimal interface.

Fluid animations.

No clutter.

---

# 7. Core Gameplay

Every day players receive

Today's Daily Run.

A Daily Run consists of

30 seconds.

Players solve as many puzzles as possible.

Each solved puzzle awards points.

Difficulty increases continuously.

At the end

Final Score

↓

Leaderboard

↓

Replay

↓

Return tomorrow

---

# 8. Core Gameplay Loop

Player Opens Game

↓

Countdown (3)

↓

30 Second Timer Starts

↓

Solve Puzzle

↓

Generate Next Puzzle

↓

Solve Again

↓

Difficulty Increases

↓

Timer Ends

↓

Final Score

↓

Leaderboard

↓

Replay

↓

Exit

↓

Return Tomorrow

---

# 9. Daily Challenge

Every day

One unique seed.

Everyone receives

the exact same sequence.

Fair competition.

Daily challenge resets every UTC day.

---

# 10. Puzzle Structure

Every puzzle contains

- Start Node
- Goal Node(s)
- Obstacles
- Interactive Elements
- Allowed Drawing Area

Player draws

ONE continuous line.

Puzzle validates.

If solved

↓

Next Puzzle

---

# 11. Difficulty Curve

Puzzle 1

Tutorial difficulty

Puzzle 2

Easy

Puzzle 3

Easy+

Puzzle 4

Medium

Puzzle 5

Medium+

Puzzle 6

Hard

Puzzle 7

Expert

Puzzle 8+

Impossible

Difficulty scales continuously.

---

# 12. Scoring

Score =

Base Puzzle Value

+

Remaining Time Bonus

+

Combo Bonus

+

Perfect Bonus

---

Example

Puzzle Completed

100

Fast Solve

+30

Combo

+20

Perfect

+10

Total

160

---

# 13. Combo System

Every consecutive solve

increases combo multiplier.

Miss

↓

Combo resets.

---

# 14. Timer

30 seconds.

Cannot pause.

Cannot retry.

One official submission per day.

Practice mode may exist later.

---

# 15. Leaderboards

Daily

Top Players

Top Friends (Future)

Personal Best

Today's Rank

Percentile

---

Displayed

Player

Score

Puzzles Solved

Completion Time

---

# 16. Replay System (MVP)

Store

- Drawing Path
- Timestamp
- Puzzle Seed

Player can watch

Top 10 replays.

---

# 17. Progression (Phase 1)

No XP.

No Levels.

Player progression is

Skill Progression.

Metrics shown

- Best Score
- Current Streak
- Highest Puzzle Reached
- Personal Best

---

# 18. Daily Streak

Play

↓

Streak +1

Miss Day

↓

Reset

Future reward system.

---

# 19. User Flow

Launch

↓

Loading

↓

Today's Challenge

↓

Countdown

↓

Gameplay

↓

Results

↓

Leaderboard

↓

Replay

↓

Exit

---

# 20. Functional Requirements

## Gameplay

- Draw continuous line
- Validate solution
- Generate next puzzle
- Increase difficulty
- End at 30 seconds

---

## Backend

- Generate Daily Seed
- Store Score
- Store Replay
- Return Leaderboard

---

## Frontend

- Render puzzle
- Draw line
- Animate success
- Display timer
- Display score

---

# 21. Non-functional Requirements

Load Time

<2 seconds

FPS

60 FPS

Input Latency

<16 ms

Offline

No

Mobile First

Yes

---

# 22. Edge Cases

Player closes app

↓

Run invalid

Network lost

↓

Retry submission

Invalid replay

↓

Discard

Duplicate submission

↓

Reject

---

# 23. Anti-cheat

Server validates

- Puzzle Seed
- Replay
- Solve Order
- Completion Time

Reject impossible runs.

---

# 24. Accessibility

Colorblind-safe palette

Large touch targets

High contrast mode

Reduced motion option

---

# 25. Analytics Events

Game Opened

Run Started

Puzzle Solved

Puzzle Failed

Run Finished

Leaderboard Viewed

Replay Viewed

Session Ended

---

# 26. Out of Scope (Phase 1)

Community-created puzzles

Weekly events

Boss fights

Cosmetics

Unlockables

Achievements

Friends leaderboard

Guilds

Season Pass

Monetization

---

# 27. Future Roadmap

## Phase 2

Community Progress

Replay Sharing

Weekly Events

Cosmetics

Themes

Daily Badges

---

## Phase 3

Community Puzzle Builder

Voting

Featured Creators

Puzzle Marketplace

World Map

Boss Events

Seasonal Challenges

---

# 28. Risks

## Risk

Puzzle repetition

Mitigation

Procedural generation

---

## Risk

Leaderboard cheating

Mitigation

Replay validation

---

## Risk

Difficulty spikes

Mitigation

Difficulty simulation

---

## Risk

Low retention

Mitigation

Daily content

Replay system

Community progression

---

# 29. Definition of Success

A successful MVP should make players feel:

"I can beat yesterday."

"I wonder what tomorrow's puzzle will be."

"I want to watch how the #1 player solved this."

If those three emotions exist, the product has achieved its core objective.

---

# 30. Open Questions

- Should players get exactly one official run per day or allow multiple attempts while only the best score counts?
- How much of the puzzle sequence should be deterministic versus procedurally varied?
- Should replay viewing unlock only after submitting a run?
- How should ties on the leaderboard be resolved?
- What is the ideal difficulty progression to keep both new and expert players engaged?
- Should future seasons introduce entirely new mechanics or only new puzzle layouts?

---