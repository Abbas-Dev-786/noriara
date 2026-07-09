# Game Design Document

# Part 1 - Vision & Core Gameplay

# Project

**Daily Line** *(Working Title)*

Genre:

Daily Competitive Gesture Puzzle

Platform:

Reddit Devvit Web

Engine:

Phaser

Status:

Draft

---

## 1. Game Vision

Daily Line is a competitive puzzle game built around one magical mechanic:

> Draw a single gesture, release it, and watch the line come alive.

The player shapes a continuous line. When they lift their finger, that line starts moving. It repeats the player's exact motion pattern, slithering across the board while keeping its original length.

The objective is always simple:

> Collect every colored circle. Avoid every black hole.

Daily Line is designed as a daily sport rather than a campaign. Every player receives the same seeded puzzle sequence each UTC day. The objective is not just to solve puzzles, but to solve more of them than everyone else in 30 seconds.

---

## 2. Design Philosophy

The game follows one philosophy:

> One gesture. Infinite personality.

No unnecessary systems.

No start-to-goal route puzzles in the MVP.

No inventory.

No RPG mechanics.

No text-heavy tutorials.

The living line itself carries the experience.

---

## 3. Design Goals

### Learn in 5 Seconds

Players should understand the board by sight:

- Colored circles are good.
- Black holes are bad.
- Draw a shape and release.

### Finish in 30 Seconds

A complete session should fit inside Reddit browsing behavior.

### Return Tomorrow

Players should think:

> "I wonder what today's board is."

### Mastery

A beginner draws simple lines.

An expert draws expressive motion patterns.

A top player finds surprising, elegant solutions.

### Spectatorship

Watching another player's replay should be entertaining because every gesture has a visible personality.

---

## 4. Core Experience

The emotional journey should be:

```text
Curiosity
Confidence
Experimentation
Flow
Pressure
Success
Comparison
Curiosity for tomorrow
```

---

## 5. Design Pillars

### Elegant

Only one required player action: draw one continuous gesture.

### Magical

The line comes alive after release and keeps moving.

### Fair

Everyone receives the same daily sequence.

### Competitive

Every solve and every second matters.

### Replayable

The same board can have many solutions, from simple to complex.

---

## 6. Player Fantasy

The player fantasy is not:

> "I found the one correct route."

The fantasy is:

> "I created a line that solved it."

The player should evolve from:

```text
random drawing
intentional motion
planned repetition
elegant solution design
expert precision
```

---

## 7. Target Emotions

Primary:

- Curiosity.
- Satisfaction.
- Focus.
- Competition.
- Delight.

Secondary:

- Surprise.
- Mastery.
- Pride.

Never:

- Confusion.
- Waiting.
- Arbitrary failure.
- Pixel-perfect frustration.

---

## 8. Session Length

Average:

- 30-45 seconds.

Maximum:

- About 2 minutes including results and leaderboard.

Reason:

- The game should naturally fit Reddit's feed consumption behavior.

---

## 9. Gameplay Loop

```text
Open Reddit
Open Daily Line
Countdown
Puzzle appears
Draw one gesture
Release
Line comes alive
Collect targets or fail
Next puzzle or immediate retry
Repeat until timer ends
Results
Leaderboard
Replay
Return tomorrow
```

---

## 10. Core Mechanic

Everything revolves around one action:

> Draw a single continuous gesture.

The player may:

- Start drawing anywhere in the allowed play area.
- Drag without lifting.
- Draw curves, loops, hooks, waves, or straight lines.
- Release to activate the line.

The player may not:

- Draw multiple strokes for one attempt.
- Edit the gesture after release.
- Pause the line after release.
- Control the line directly after release.

---

## 11. Gesture Capture

When the player touches or clicks:

- Start recording an ordered point array.
- Each pointer movement appends a 2D coordinate.
- Points are resampled or smoothed to produce stable motion.
- The visible line follows the pointer immediately.

When the player releases:

- Drawing ends.
- Locomotion begins instantly.
- The original gesture length becomes the permanent body length of the moving line for that attempt.
- The player cannot add new points until the attempt succeeds or fails.

---

## 12. Locomotion

After release, the line keeps moving by repeating its own motion.

Technical rule:

- Convert the smoothed gesture into a sequence of displacement vectors.
- Move the line head through that displacement sequence at constant speed.
- When the sequence ends, repeat it again from the current head position.
- The repeated copies snap end-to-start, creating an infinite path.
- Render only the trailing body segment equal to the original gesture length.
- The tail follows the exact path already traveled by the head.

This is the most important game algorithm.

If this does not feel magical, the game does not work.

---

## 13. Puzzle Entities

Phase 1 has only two active board entities.

### Colored Circles

Purpose:

- Targets.

Interaction:

- Any part of the moving line touching a colored circle collects it.
- Collected circles disappear with a soft pop or fade.
- Collecting the final colored circle wins the puzzle.

### Black Holes

Purpose:

- Hazards.

Interaction:

- Any part of the moving line touching a black hole fails the attempt.
- The line should be destroyed with a clear black-hole/suck-in effect.
- The same puzzle resets immediately for another draw.

---

## 14. Collision Rules

Collision must check the whole moving line body.

It is not enough to check only the head.

Implementation can use:

- Segment-to-circle checks across the rendered body.
- A chain of small colliders.
- An edge collider equivalent.

If the tail grazes a black hole, the attempt fails.

If any body segment touches a colored circle, that target is collected.

---

## 15. Boundary Rules

Top and bottom:

- Act as reflective boundaries.
- The line bounces by reflecting vertical movement.
- The repeated motion continues after reflection.

Left and right:

- Act as escape boundaries.
- If the whole line leaves left or right while targets remain, the attempt fails.
- If all targets were collected first, the puzzle has already succeeded.

---

## 16. Win and Loss

Win:

- The line collects the final colored circle.
- Success feedback plays.
- Score updates.
- The next puzzle appears immediately.

Loss:

- The line touches a black hole.
- Or the entire line leaves horizontally before all targets are collected.
- The line disappears.
- Combo resets.
- The current puzzle remains.
- The player draws again.

Failure costs time, not progress.

---

## 17. Difficulty Philosophy

Difficulty should come from:

- Planning a gesture whose repeated motion reaches all targets.
- Avoiding hazards across the whole body.
- Understanding bounce behavior.
- Seeing how a drawn motion will continue.

Difficulty should not come from:

- Tiny hitboxes.
- Hidden rules.
- Reading instructions.
- Start/goal constraints.
- Pixel-perfect gaps.

---

## 18. Difficulty Curve

```text
Puzzle 1: one target, no hazard
Puzzle 2: two targets, no hazard
Puzzle 3: two targets, one simple hazard
Puzzle 4: three targets, one hazard
Puzzle 5: three targets, two hazards
Puzzle 6+: more planning, denser but fair layouts
```

The first puzzle should teach by interaction, not text.

---

## 19. Failure Philosophy

Failure should feel immediate, readable, and fair.

Bad failure:

- The player cannot tell what happened.
- The hazard collision feels early or late.
- The line behaves differently than expected.

Good failure:

- The collision point is obvious.
- The line destruction explains the mistake.
- The player can redraw instantly.

---

## 20. Success Feedback

Every solved puzzle should feel rewarding.

Success includes:

- Bright flash.
- Target pop.
- Score popup.
- Combo pulse.
- Immediate next puzzle.

No success delay should exceed 300 ms.

---

## 21. Flow State

The ideal player loop:

```text
Look
Imagine motion
Draw
Release
Watch
Learn
Succeed or redraw
```

No loading.

No menus.

No interruption during the run.

---

## 22. Input Feel

The drawing system must feel:

- Smooth.
- Immediate.
- Precise.
- Predictable.
- Low latency.

Players should trust the line.

If they fail, they should understand it was their motion pattern, not a control problem.

---

## 23. Visual Clarity

At any moment the player should instantly identify:

- Colored targets.
- Black holes.
- The moving line.
- Remaining time.
- Current score.
- Combo.

Nothing else should compete for attention.

---

## 24. UX Principles

Remove everything unnecessary.

No:

- Pop-up tutorials.
- Confirmation screens.
- Settings during gameplay.
- Text explanations inside the playfield.
- Extra puzzle entities in Phase 1.

---

## 25. Accessibility

Support:

- Colorblind-safe target and hazard styling.
- High contrast mode.
- Large touch targets.
- Reduced motion option.
- Haptic toggle where supported.
- Sound toggle.

Do not rely on color alone. Colored targets and black holes should also differ by shape treatment, animation, glow, or outline.

---

## 26. Design Rules

Every new mechanic must satisfy:

- Compatible with living gesture locomotion.
- Learnable without text.
- Understandable in under 10 seconds.
- Works on touch.
- Works inside a 30-second run.
- Supports deterministic replay.
- Supports server validation.

If a mechanic would turn the game into generic path drawing, it should not enter Phase 1.

---

## 27. Anti-Goals

The game should never become:

- A start-to-goal path puzzle collection.
- A story game.
- A level campaign.
- An RPG.
- A grind for XP.
- A collectible economy.
- A cluttered arcade game.

The identity of Daily Line comes from:

- Daily competition.
- Living gesture lines.
- Colored targets and black holes.
- Mastery through expressive repetition.

---

## 28. Definition of Great Gameplay

A great Daily Line session ends with one of these thoughts:

> "I almost made the perfect line."

> "How did the #1 player draw that?"

> "Tomorrow I'll make a better shape."

Those reactions are the emotional north star for every design decision.
