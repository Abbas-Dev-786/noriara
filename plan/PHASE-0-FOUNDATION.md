# Phase 0 - Foundation

## Goal

Create the technical foundation for Daily Line.

This phase ends when a Devvit Web app runs locally with a React shell and an embedded Phaser canvas.

## Why This Phase Exists

Before building game systems, we need to prove that the platform stack works:

- Devvit Web project structure.
- React client.
- Phaser rendering.
- Devvit server endpoint.
- Shared TypeScript modules.
- Local development workflow.

## Scope

### Included

- Scaffold Devvit Web app.
- Configure TypeScript.
- Add React client app.
- Add Phaser 3.
- Add a placeholder Phaser scene.
- Add basic routing between Home and Game.
- Add server health endpoint.
- Add shared folder for seed, puzzle, scoring, and replay modules.
- Add project scripts.
- Add basic lint/typecheck/test setup if compatible with the scaffold.

### Not Included

- Real puzzle generation.
- Real scoring.
- Leaderboards.
- Replay storage.
- Anti-cheat.
- Streaks.
- Live operations.

## Target App Flow

```text
Open app
Home screen appears
Tap Play
Phaser canvas appears
Placeholder line/puzzle renders
Server health endpoint can be called
```

## Implementation Tasks

### 1. Project Scaffold

- Create `package.json`.
- Create `devvit.json`.
- Create `src/client`.
- Create `src/server`.
- Create `src/shared`.
- Configure Vite or Devvit-supported client build tooling.

### 2. React Shell

- Create `App.tsx`.
- Add screens:
  - Home.
  - Game.
  - Placeholder Results.
- Add minimal CSS.
- Ensure mobile viewport support.

### 3. Phaser Integration

- Install Phaser.
- Create `DailyLineGame.ts`.
- Create one placeholder scene.
- Mount Phaser inside a React component.
- Cleanly destroy Phaser instance on unmount.

### 4. Server Baseline

- Create server entrypoint.
- Add `GET /api/health`.
- Add `GET /api/bootstrap` placeholder.
- Confirm client can call `/api/bootstrap`.

### 5. Shared Modules

Create placeholder modules:

- `src/shared/seed`.
- `src/shared/puzzle`.
- `src/shared/scoring`.
- `src/shared/replay`.

### 6. Developer Workflow

- Add scripts for local dev.
- Add scripts for typecheck.
- Add scripts for tests if test runner is added.
- Document how to run the app locally.

## Milestone Build

At the end of Phase 0, the app should show:

- Home screen.
- Play button.
- Phaser canvas with a placeholder scene.
- Successful response from `/api/bootstrap`.

## Validation Checklist

- [ ] App starts locally.
- [ ] React renders without console errors.
- [ ] Phaser canvas appears after pressing Play.
- [ ] Phaser instance cleans up when leaving the game screen.
- [ ] Client can fetch `/api/bootstrap`.
- [ ] TypeScript compiles.
- [ ] Project structure matches the architecture plan.

## Acceptance Criteria

Phase 0 is complete when a user can open the local app, press Play, and see a Phaser-rendered game surface inside the Devvit Web app.

## Risks

### Devvit Build Shape Differs From Assumption

Mitigation:

Follow the current Devvit Web scaffold and adapt the folder structure while preserving client, server, and shared boundaries.

### Phaser Lifecycle Issues in React

Mitigation:

Mount Phaser in a dedicated component and destroy it on unmount.

