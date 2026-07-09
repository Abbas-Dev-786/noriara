# Game Design Document (GDD)

# Part 3 — UX, Visual Design & Game Feel

---

# Project

**Daily Line** _(Working Title)_

Version: 1.0

Document:
UX, Visual Design & Game Feel

---

# 1. UX Philosophy

The entire UX should communicate one idea:

> **Open → Understand → Play**

No tutorials.

No onboarding.

No reading.

The interface should disappear, leaving only the puzzle.

The best mobile puzzle games achieve this by minimizing interface friction and making interaction itself the tutorial. Good game feel also depends on responsiveness, clarity, and streamlining rather than visual effects alone. :contentReference[oaicite:0]{index=0}

---

# 2. UX Principles

## Principle 1

### Less UI

Everything that isn't gameplay should be removed.

Never ask:

- Are you sure?
- Continue?
- Retry?
- Exit?

One tap.

One action.

---

## Principle 2

### Immediate Feedback

Every interaction must receive feedback.

Draw

↓

Line appears instantly

Correct

↓

Explosion

Incorrect

↓

Snap Back

Waiting kills flow.

---

## Principle 3

### Zero Cognitive Load

Player should never ask

"What do I press?"

Instead they think

"How do I solve this?"

---

# 3. Information Hierarchy

During gameplay only these elements should be visible.

```
━━━━━━━━━━━━━━━━━━

TIME

SCORE

━━━━━━━━━━━━━━━━━━

Puzzle

━━━━━━━━━━━━━━━━━━

Combo

━━━━━━━━━━━━━━━━━━
```

Nothing else.

---

# 4. Screen Flow

```
Launch

↓

Loading

↓

Home

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

Home
```

No extra screens.

---

# 5. Home Screen

Purpose

Create excitement.

---

## Components

- Logo
- Today's Challenge
- Current Streak
- Play Button
- Leaderboard Button

Future

- Community Progress
- Weekly Event

---

## Layout

```
━━━━━━━━━━━━━━━━━━

Daily Line

🔥 Streak 12

━━━━━━━━━━━━━━━━━━

Today's Challenge

Play

━━━━━━━━━━━━━━━━━━

Leaderboard

━━━━━━━━━━━━━━━━━━
```

---

# 6. Countdown Screen

```
3

↓

2

↓

1

↓

GO
```

Duration

3 seconds

Background subtly zooms.

Pulse animation.

Small vibration.

---

# 7. Gameplay Screen

```
━━━━━━━━━━━━━━━━━━

00:28

Score 480

━━━━━━━━━━━━━━━━━━

Puzzle Area

━━━━━━━━━━━━━━━━━━

Combo x4

━━━━━━━━━━━━━━━━━━
```

Only essential information.

---

# 8. Results Screen

Appears instantly.

Shows

- Final Score
- Rank
- Best Score
- Puzzles Solved
- Current Streak

Buttons

- Watch Replay
- Leaderboard
- Home

---

# 9. Leaderboard Screen

Columns

```
#

Player

Score

Puzzles
```

Highlight

Current Player

Top 3

Animated entry.

---

# 10. Replay Screen

Minimal UI.

Player line draws itself.

Playback controls

- Pause
- Restart
- Exit

Nothing else.

---

# 11. Visual Language

The game should feel

Minimal

Modern

Elegant

Premium

Think

Apple Design Award

not

Arcade Flash Game

---

# 12. Art Direction

Flat geometric style.

High contrast.

No unnecessary textures.

Focus on

Shapes

Motion

Color

Light

---

## Inspiration

- Blek
- Monument Valley
- Alto's Odyssey
- Klocki
- Euclidean Lands

Not for imitation—but for clarity, restraint, and polish.

---

# 13. Color Palette

## Background

Dark charcoal

---

## Primary

White

---

## Accent

Electric Blue

---

## Success

Green

---

## Failure

Red

---

## Combo

Orange

---

Accessibility note

Never rely on color alone.

Use

Animation

Scale

Icons

Sound

Accessibility guidance consistently recommends combining color with additional cues and offering high-contrast options for players with visual impairments. :contentReference[oaicite:1]{index=1}

---

# 14. Typography

One font.

Bold.

Rounded.

Easy to read.

Numbers should be highly legible.

Timer always largest.

---

# 15. Animation Principles

Every animation must have purpose.

Animations should communicate

- Success
- Failure
- Importance
- Focus

Never animate for decoration.

---

# 16. Motion Design

Puzzle Transition

200 ms

Fade

Scale

New puzzle appears.

---

Score Popup

Float upward.

Fade.

150 ms.

---

Combo

Pulse.

Glow.

Scale.

---

Leaderboard Entry

Slide.

Fade.

Stagger.

---

# 17. Drawing Feel

This is the most important interaction.

The line should feel

- Immediate
- Smooth
- Stable
- Precise

No visible latency.

If the drawing feels wrong,

the entire game feels wrong.

Game feel research consistently identifies responsive input and immediate system response as foundational to player satisfaction. :contentReference[oaicite:2]{index=2}

---

# 18. Line Rendering

Properties

Rounded Caps

Rounded Joins

Anti-aliased

Subpixel Rendering

Consistent Width

The line itself becomes part of the game's identity.

---

# 19. Success Feedback ("Juice")

Correct solve triggers

✓ Flash

✓ Pop

✓ Tiny Camera Pulse

✓ Score Popup

✓ Success Sound

✓ Next Puzzle

All within 300 ms.

Polish ("juice") amplifies important events and reinforces player actions without interrupting flow. :contentReference[oaicite:3]{index=3}

---

# 20. Failure Feedback

Failure should feel

Immediate

Clear

Forgiving

Sequence

```
Wrong Line

↓

Soft Shake

↓

Red Flash

↓

Reset

↓

Try Again
```

Duration

<400 ms

---

# 21. Audio Direction

Minimal.

Clean.

Pleasant.

No looping music during gameplay.

Only ambient pad.

The game should feel

Focused.

---

# 22. Sound Effects

Draw

Tiny scratch

Success

Bright chime

Failure

Soft click

Countdown

Deep tick

Time Up

Bell

Leaderboard

Subtle sparkle

Avoid repetitive or harsh sounds.

---

# 23. Haptics (Mobile)

Tiny vibration

Success

Short pulse

Failure

Soft bump

Countdown

Micro pulse

Never overuse haptics.

---

# 24. Mobile UX

Everything reachable

with one thumb.

Important controls

Bottom half.

No tiny buttons.

Touch targets

≥44 px.

---

# 25. Performance Goals

Target

60 FPS

Input Latency

<16 ms

Frame Drops

Never during drawing.

Visual smoothness directly influences perceived game quality and responsiveness. :contentReference[oaicite:4]{index=4}

---

# 26. Accessibility

Support

✓ High Contrast Mode

✓ Colorblind-safe palette

✓ Reduced Motion

✓ Haptic Toggle

✓ Sound Toggle

✓ Large UI Scaling

Accessibility should be considered from the start rather than retrofitted later. :contentReference[oaicite:5]{index=5}

---

# 27. Emotional Curve

```
Curiosity

↓

Confidence

↓

Speed

↓

Pressure

↓

Victory

↓

Comparison

↓

Motivation
```

Every session should follow this rhythm.

---

# 28. Visual Identity

If someone sees one screenshot,

they should instantly recognize

Daily Line.

The visual identity should come from

- elegant geometry,
- distinctive line rendering,
- restrained color use,
- and confident motion.

---

# 29. UX Anti-Patterns

Never include

❌ Pop-up tutorials

❌ Forced registration

❌ Loading between puzzles

❌ Reward videos

❌ Cluttered HUD

❌ Decorative animations that delay gameplay

❌ Hidden gestures

---

# 30. UX Success Criteria

A first-time player should be able to:

- Understand the goal within 5 seconds.
- Start playing without instructions.
- Complete at least one puzzle in the first session.
- Finish an entire run in under one minute.
- Immediately understand why they succeeded or failed.
- Want to compare their score with other players.

If those goals are met, the UX has achieved its purpose.

---

# Deliverables for the Art & UX Team

## Visual Assets

- Logo
- App Icon
- Home Screen
- Gameplay HUD
- Results Screen
- Leaderboard
- Replay Screen
- Countdown Animation
- Success Animation
- Failure Animation
- Combo Animation
- Line Rendering Styles

## Audio Assets

- Countdown SFX
- Draw SFX
- Success SFX
- Failure SFX
- Timer End SFX
- UI Clicks
- Ambient Loop

## Motion Assets

- Puzzle Transition
- Score Popups
- Combo Pulse
- Camera Pulse
- Screen Shake
- Leaderboard Reveal
- Replay Playback

These assets, combined with the gameplay systems from Parts 1 and 2, should make the MVP feel polished enough to resemble a launch-ready product rather than a typical hackathon prototype.

---
