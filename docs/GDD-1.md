# Game Design Document (GDD)

# Part 1 — Vision & Core Gameplay

---

# Project

**Daily Line** _(Working Title)_

Genre:
Daily Competitive Puzzle

Platform:
Reddit Devvit Web

Engine:
Phaser 3

Document Version:
1.0

Status:
Draft

---

# 1. Game Vision

Daily Line is a competitive puzzle game built around a single elegant mechanic:

> Draw one continuous line to solve increasingly difficult puzzles before time runs out.

Unlike traditional puzzle games, Daily Line is designed as a **daily sport** rather than a campaign.

Every player receives the exact same challenge every day.

The objective is not merely to finish the puzzles—it is to solve more puzzles than everyone else within 30 seconds.

The game should feel:

- Instant
- Elegant
- Competitive
- Satisfying
- Replayable
- Social

A GDD is intended to be a living document that communicates gameplay, mechanics, UX, art, controls, and other implementation details to the entire development team. :contentReference[oaicite:0]{index=0}

---

# 2. Design Philosophy

The game follows one philosophy:

> **One mechanic.
> Infinite mastery.**

No unnecessary systems.

No dialogue.

No inventory.

No RPG mechanics.

No unnecessary menus.

The mechanic itself should carry the experience.

---

## Design Goals

### Learn in 5 seconds

A player opening Reddit for the first time should understand the game without reading instructions.

---

### Finish in 30 seconds

A complete session should comfortably fit inside a Reddit browsing session.

---

### Return tomorrow

Players should think

"I wonder what today's challenge is."

---

### Mastery

A beginner solves

3 puzzles.

An expert solves

12.

A professional solves

20.

Everyone plays the same game.

---

### Spectatorship

Watching another player's replay should be entertaining.

Players should immediately understand why someone performed better.

---

# 3. Core Experience

The emotional journey should be:

```
Curiosity

↓

Confidence

↓

Flow

↓

Pressure

↓

Victory

↓

Competition

↓

Curiosity for Tomorrow
```

---

# 4. Design Pillars

## Pillar 1

### Elegant

One mechanic.

No unnecessary complexity.

Everything exists to support drawing.

---

## Pillar 2

### Fair

Everyone receives

the exact same challenge.

Skill determines the winner.

---

## Pillar 3

### Competitive

Every puzzle solved matters.

Every second matters.

---

## Pillar 4

### Fluid

Drawing should feel

smooth

responsive

predictable

beautiful

---

## Pillar 5

### Replayable

The challenge changes every day.

Not every hour.

Daily anticipation is the retention mechanic.

---

# 5. Player Fantasy

The player fantasy is **not**:

"I am saving the world."

The fantasy is

> **I am becoming incredibly precise.**

The player should slowly transform from

random drawing

↓

intentional drawing

↓

optimized drawing

↓

expert-level precision

---

# 6. Target Emotions

Primary

- Curiosity
- Satisfaction
- Focus
- Competition

Secondary

- Surprise
- Mastery
- Pride

Never

- Confusion
- Frustration
- Waiting
- Grinding

---

# 7. Session Length

Average

30–45 seconds

Maximum

2 minutes

Reason

This game should naturally fit Reddit's feed consumption behavior.

---

# 8. Gameplay Loop

```
Open Reddit

↓

Open Daily Line

↓

Countdown

↓

Solve Puzzle

↓

Instant Success Feedback

↓

Next Puzzle

↓

Difficulty Increases

↓

Repeat

↓

Timer Ends

↓

Results

↓

Leaderboard

↓

Replay

↓

Leave

↓

Return Tomorrow
```

---

# 9. Core Mechanic

Everything in the game revolves around one action:

**Draw a single continuous line.**

The player may:

- Start anywhere allowed
- Continue without lifting
- Cross existing lines (when permitted)
- Finish after satisfying the puzzle conditions

The player may not:

- Teleport
- Erase
- Lift and redraw
- Use multiple strokes

---

# 10. Controls

## Mobile

Finger

↓

Touch

↓

Drag

↓

Release

---

## Desktop

Mouse

↓

Click

↓

Drag

↓

Release

---

No buttons are required during gameplay.

---

# 11. Puzzle Grammar

Every puzzle consists of:

## Start Point

Where drawing begins.

---

## Goal

The puzzle objective.

Examples:

Reach destination.

Cover area.

Connect nodes.

Avoid obstacles.

Trigger switches.

---

## Constraints

Rules.

Examples

- One stroke
- Don't touch walls
- Pass through checkpoints
- Stay inside area

---

## Feedback

Immediate.

Correct

↓

Success animation

Incorrect

↓

Reset animation

---

# 12. Difficulty Philosophy

Difficulty should come from

thinking

not

precision.

Bad difficulty

Tiny hitboxes

Microscopic gaps

Invisible objects

Good difficulty

Planning

Timing

Geometry

Path optimization

---

# 13. Difficulty Curve

```
Puzzle 1

Tutorial

↓

Puzzle 2

Very Easy

↓

Puzzle 3

Easy

↓

Puzzle 4

Easy+

↓

Puzzle 5

Medium

↓

Puzzle 6

Medium+

↓

Puzzle 7

Hard

↓

Puzzle 8

Hard+

↓

Puzzle 9+

Expert
```

Players naturally discover their skill ceiling.

---

# 14. Failure Philosophy

Failure should cost

time

not

progress.

Incorrect line

↓

Immediate reset

↓

Player instantly tries again

No lives.

No penalties.

No waiting.

---

# 15. Success Feedback

Every solved puzzle should feel rewarding.

Success includes:

✓ Bright flash

✓ Success sound

✓ Camera pulse

✓ Score popup

✓ Combo increase

✓ Immediate next puzzle

No delays longer than 300 ms.

---

# 16. Flow State

The ideal player enters this loop:

```
Think

↓

Draw

↓

Success

↓

Next

↓

Think

↓

Draw

↓

Success

↓

Next
```

No loading.

No interruptions.

No menus.

---

# 17. Input Feel

The drawing system should feel:

- Smooth
- Immediate
- Precise
- Predictable
- Low latency

Players should trust the line.

If they fail,

they should blame themselves,

not the controls.

Game feel—including responsiveness, clear feedback, and the "polish" of interactions—is widely recognized as a major factor in how satisfying games feel to play. :contentReference[oaicite:1]{index=1}

---

# 18. Visual Clarity

At any moment the player should instantly identify:

- Current puzzle
- Allowed drawing area
- Start
- Goal
- Obstacles
- Remaining time
- Current score

Nothing else should compete for attention.

---

# 19. UX Principles

Remove everything unnecessary.

No:

- Popups
- Dialogs
- Ads
- Long tutorials
- Confirmation screens
- Settings during gameplay

Everything should be one tap away.

---

# 20. Accessibility

Support:

- Colorblind-safe palette
- Large touch targets
- High contrast mode
- Reduced motion mode
- Haptic feedback (mobile)

---

# 21. Design Rules

Every new mechanic must satisfy:

✓ Learnable in under 10 seconds

✓ Explainable without text

✓ Compatible with touch

✓ Works in under 30 seconds

✓ Supports procedural generation

✓ Scales in difficulty

If a mechanic fails any of these checks, it should not be added to Phase 1.

---

# 22. Anti-Goals

The game should never become:

❌ A story game

❌ A level-based campaign

❌ An RPG

❌ A grind for XP

❌ A collectible economy

❌ A clone of another puzzle game

The identity of Daily Line should come from the combination of:

- daily competition,
- elegant single-stroke puzzles,
- and mastery through repetition.

---

# 23. Definition of Great Gameplay

A great Daily Line session ends with one of these thoughts:

> "I almost solved one more."

> "How did the #1 player do that?"

> "Tomorrow I'll beat my score."

Those three reactions are the emotional north star for every design decision in the game.

---

