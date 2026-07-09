# Game Design Document

# Part 3 - UX, Visual Design & Game Feel

# Project

**Daily Line** *(Working Title)*

Version:

1.0

Document:

UX, Visual Design & Game Feel

---

## 1. UX Philosophy

The UX should communicate one idea:

> Draw once. Release. Watch it move.

No tutorial should be required. The board should teach itself:

- Colored circles invite collection.
- Black holes signal danger.
- The player's drawn line visibly comes alive.

The interface should disappear during play.

---

## 2. UX Principles

### Less UI

Everything that is not gameplay should be removed from the run.

Never ask:

- Are you sure?
- Continue?
- Retry?
- Confirm?

### Immediate Feedback

Every interaction needs feedback:

- Drawing shows the line instantly.
- Release starts movement instantly.
- Target collection pops.
- Hazard failure destroys the line clearly.

### Zero Cognitive Load

The player should never ask:

> "What do I press?"

They should ask:

> "What shape should I draw?"

---

## 3. Gameplay Information Hierarchy

During gameplay only these elements should be visible:

```text
Timer
Score
Puzzle area
Combo
```

The playfield contains only:

- Colored targets.
- Black holes.
- The player's line.

No labels, instructions, start markers, or goal markers should appear inside Phase 1 puzzles.

---

## 4. Screen Flow

```text
Launch
Loading
Home
Today's Challenge
Countdown
Gameplay
Results
Leaderboard
Replay
Home
```

No extra screens are required for Phase 1.

---

## 5. Home Screen

Purpose:

- Let the player start today's run with minimal friction.

Components:

- Logo.
- Today's Challenge.
- Current streak when available.
- Play button.
- Leaderboard button when available.

The home screen should not explain every rule. The first board should teach the interaction.

---

## 6. Countdown Screen

```text
3
2
1
GO
```

Duration:

- 3 seconds.

Optional feedback:

- Subtle pulse.
- Small haptic tick.
- No blocking tutorial overlay.

---

## 7. Gameplay Screen

Gameplay layout:

```text
00:28
Score 480

[playfield]

Combo x4
```

The playfield should be visually calm so the moving line is easy to read.

---

## 8. Results Screen

Appears immediately when time expires.

Shows:

- Final score.
- Puzzles solved.
- Max combo.
- Daily rank when available.
- Personal best when available.

Buttons:

- Watch Replay when available.
- Leaderboard when available.
- Home or Practice.

---

## 9. Leaderboard Screen

Columns:

```text
Rank
Player
Score
Puzzles
```

Highlight:

- Current player.
- Top 3.
- Replay availability.

---

## 10. Replay Screen

The replay screen should feel like watching the player think.

Replay should show:

- Gesture drawing.
- Release moment.
- Living line movement.
- Target collection.
- Hazard failures.
- Puzzle transitions.

Controls:

- Pause.
- Restart.
- Exit.

Keep UI minimal.

---

## 11. Visual Language

The game should feel:

- Minimal.
- Modern.
- Elegant.
- Magical.
- Premium.

The key visual identity is the moving line, not decorative UI.

---

## 12. Art Direction

Flat geometric style.

High contrast.

No unnecessary textures.

Focus on:

- Shapes.
- Motion.
- Color.
- Light.
- Smooth line rendering.

Inspirations:

- Blek.
- Monument Valley.
- Alto's Odyssey.
- Klocki.
- Euclidean Lands.

These are references for clarity and polish, not for feature copying.

---

## 13. Color and Shape Language

Background:

- Dark charcoal or clean neutral.

Player line:

- White or high-contrast primary color.

Targets:

- Bright colored circles.
- Soft glow or ring.
- Pop/fade on collection.

Hazards:

- Black circles.
- Strong outline or gravity-like visual treatment.
- Suck-in failure effect.

Accessibility:

- Do not rely on color alone.
- Targets and hazards should differ by value, outline, animation, and behavior.

---

## 14. Typography

Use one readable font family.

Timer and score should be highly legible.

Text should not compete with the playfield.

---

## 15. Animation Principles

Every animation must communicate state:

- Drawing.
- Release.
- Movement.
- Collection.
- Failure.
- Success.
- Time pressure.

Do not animate for decoration during the active run.

---

## 16. Drawing Feel

This is the most important interaction.

Requirements:

- The drawn line appears under the pointer immediately.
- The line uses rounded caps and joins.
- Raw input is smoothed enough to look fluid.
- Smoothing must not make the line feel detached from the finger.
- The release-to-movement transition should be instant.

If drawing feels wrong, the game feels wrong.

---

## 17. Living Line Feel

The line should feel like the player's drawing has become alive.

Requirements:

- Movement follows the captured gesture pattern.
- Speed is steady and readable.
- The body keeps the original gesture length.
- The tail follows the head's traveled path.
- Repeated motion feels continuous.
- Bounces are visually understandable.

The player should be able to learn by watching the line move.

---

## 18. Line Rendering

Properties:

- Rounded caps.
- Rounded joins.
- Anti-aliased where possible.
- Consistent width.
- Stable body length.
- No jagged point-to-point artifacts.

The line itself is part of the brand identity.

---

## 19. Success Feedback

Success triggers:

- Final target pop.
- Bright but brief flash.
- Score popup.
- Combo pulse.
- New puzzle within 300 ms.

The transition must not interrupt flow.

---

## 20. Failure Feedback

Failure should feel immediate and explain why it happened.

Black-hole collision:

```text
Line touches black hole
Collision point is visible
Line collapses or gets pulled in
Current puzzle resets
Player draws again
```

Horizontal escape:

```text
Line fully leaves screen
Targets remain
Line disappears
Current puzzle resets
Player draws again
```

Total failure feedback should complete quickly.

---

## 21. Audio Direction

Minimal.

Clean.

Pleasant.

No intense looping music during gameplay.

Sound effects:

- Countdown tick.
- Soft draw sound only if it does not annoy.
- Target pop.
- Failure collapse.
- Time-up bell.

All audio respects sound settings.

---

## 22. Haptics

Use haptics sparingly:

- Micro pulse on countdown.
- Short pulse on final target collection.
- Soft bump on failure.

All haptics respect haptic settings.

---

## 23. Mobile UX

The game is mobile first.

Requirements:

- Large playfield.
- No keyboard requirement.
- No tiny UI controls.
- Touch input should not scroll the page during play.
- Expanded mode should be requested for the run when supported.

---

## 24. Performance Goals

Target:

- 60 FPS.

Input latency:

- Under 16 ms.

Frame drops:

- Never during drawing or line locomotion.

Collision and rendering should be optimized around the moving line body.

---

## 25. Accessibility

Support:

- High contrast mode.
- Colorblind-safe palette.
- Reduced motion.
- Sound toggle.
- Haptic toggle.
- Large UI scaling where feasible.

Reduced motion should keep gameplay readable while reducing nonessential pulses, flashes, and shakes.

---

## 26. Emotional Curve

```text
Curiosity
Experiment
Watch
Learn
Improve
Pressure
Compare
Return
```

Every session should reinforce this rhythm.

---

## 27. Visual Identity

If someone sees one screenshot or replay, they should recognize Daily Line from:

- The living gesture line.
- Colored targets.
- Black holes.
- Restrained geometry.
- Clear motion.

---

## 28. UX Anti-Patterns

Never include:

- Pop-up tutorials.
- Start/goal labels inside Phase 1 puzzles.
- Forced registration before practice.
- Loading between puzzles.
- Reward videos.
- Cluttered HUD.
- Decorative animations that delay gameplay.
- Hidden gestures.

---

## 29. UX Success Criteria

A first-time player should be able to:

- Understand colored targets and black holes within 5 seconds.
- Draw and release without instruction.
- See the line come alive.
- Understand why the line succeeded or failed.
- Complete at least one puzzle in the first session.
- Want to compare their score with others.

If those goals are met, the UX has achieved its purpose.
