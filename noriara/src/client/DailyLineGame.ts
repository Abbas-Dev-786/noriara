import Phaser from 'phaser';
import { generatePuzzlesForSeed, PuzzleLayout, PuzzleShape } from '../shared/puzzle';
import { calculatePuzzleScore } from '../shared/scoring';
import type {
  FailureEvent,
  FailureReason,
  GestureAttempt,
  GesturePointSample,
  RunTelemetry,
  SolveEvent,
} from '../shared/api';
import {
  normalizePath,
  Point,
  polylineLength,
  segmentIntersectsCircle,
  smoothPath,
} from '../shared/geom';

export interface GameCallbacks {
  onScoreChange: (score: number, combo: number) => void;
  onTimeChange: (timeMs: number) => void;
  onFinish: (
    result: { score: number; puzzlesSolved: number; maxCombo: number },
    telemetry: RunTelemetry
  ) => void;
  onReady: (scene: Phaser.Scene & { startCountdown: () => void }) => void;
}

const GAME_WIDTH = 600;
const GAME_HEIGHT = 400;
const STEP_SIZE = 3;
const LINE_WIDTH = 6;
const SNAKE_SPEED = 300;
const MIN_GESTURE_POINTS = 5;
const MIN_GESTURE_LENGTH = 40;
const OFFSCREEN_MARGIN = 50;

type SceneState =
  | 'waiting'
  | 'countdown'
  | 'drawing'
  | 'locomotion'
  | 'resolving-success'
  | 'resolving-failure'
  | 'finished';

type PopEffect = {
  x: number;
  y: number;
  age: number;
  maxAge: number;
};

type FailureEffect = {
  x: number;
  y: number;
  radius: number;
  age: number;
  maxAge: number;
};

type PendingAttempt = {
  puzzleIndex: number;
  startedAtMs: number;
  releaseTimestampMs: number;
  pointCount: number;
  pathLength: number;
  points: GesturePointSample[];
};

class DailyLineScene extends Phaser.Scene {
  private callbacks!: GameCallbacks;
  private seed!: string;

  private puzzles: PuzzleLayout[] = [];
  private activePuzzleIndex = 0;
  private activePointerId: number | null = null;

  private state: SceneState = 'waiting';
  private timeRemainingMs = 30000;
  private runStartTime = 0;

  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private puzzlesSolved = 0;

  private puzzleStartTime = 0;

  private rawPath: Point[] = [];
  private displayPath: Point[] = [];
  private rawPointSamples: GesturePointSample[] = [];

  private snakePath: Point[] = [];
  private baseGesture: Point[] = [];
  private snakeLength = 0;
  private headIndex = 0;
  private yDir = 1;
  private accumulatedSteps = 0;

  private activeTargets: PuzzleShape[] = [];
  private popEffects: PopEffect[] = [];
  private failureEffect: FailureEffect | null = null;
  private currentAttemptStartMs = 0;
  private pendingAttempt: PendingAttempt | null = null;
  private attempts: GestureAttempt[] = [];
  private solveEvents: SolveEvent[] = [];
  private failureEvents: FailureEvent[] = [];

  private graphics!: Phaser.GameObjects.Graphics;
  private activeCountdownText: Phaser.GameObjects.Text | null = null;
  private flashAlpha = 0;

  constructor() {
    super('DailyLineScene');
  }

  init(data: { seed: string; callbacks: GameCallbacks }) {
    this.seed = data.seed;
    this.callbacks = data.callbacks;
  }

  create() {
    this.graphics = this.add.graphics();
    this.puzzles = generatePuzzlesForSeed(this.seed);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    this.callbacks.onReady(this as unknown as Phaser.Scene & { startCountdown: () => void });
    this.renderScene();
  }

  public startCountdown() {
    if (this.state !== 'waiting') return;

    this.state = 'countdown';
    let count = 3;
    this.activeCountdownText = this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY, '3', {
        fontSize: '64px',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        count--;
        if (!this.activeCountdownText) return;

        if (count > 0) {
          this.activeCountdownText.setText(count.toString());
        } else if (count === 0) {
          this.activeCountdownText.setText('GO!');
        } else {
          this.activeCountdownText.destroy();
          this.activeCountdownText = null;
          this.startGame();
        }
      },
    });
  }

  private startGame() {
    this.activePuzzleIndex = 0;
    this.score = 0;
    this.combo = 0;
    this.maxCombo = 0;
    this.puzzlesSolved = 0;
    this.timeRemainingMs = 30000;
    this.runStartTime = this.time.now;
    this.attempts = [];
    this.solveEvents = [];
    this.failureEvents = [];
    this.pendingAttempt = null;
    this.callbacks.onScoreChange(this.score, this.combo);
    this.callbacks.onTimeChange(this.timeRemainingMs);
    this.loadPuzzle(0);
  }

  private loadPuzzle(index: number) {
    this.resetAttemptState();

    const puzzle = this.puzzles[index];
    if (!puzzle) {
      this.finishGame();
      return;
    }

    this.activeTargets = puzzle.targets.map((target) => ({ ...target }));
    this.state = 'drawing';
    this.puzzleStartTime = this.time.now;
    this.renderScene();
  }

  private resetAttemptState() {
    this.rawPath = [];
    this.displayPath = [];
    this.rawPointSamples = [];
    this.snakePath = [];
    this.baseGesture = [];
    this.snakeLength = 0;
    this.headIndex = 0;
    this.yDir = 1;
    this.accumulatedSteps = 0;
    this.activePointerId = null;
    this.failureEffect = null;
    this.popEffects = [];
    this.flashAlpha = 0;
  }

  private renderScene() {
    this.graphics.clear();

    this.graphics.fillStyle(0x0f172a, 1);
    this.graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.drawBounceBoundaries();
    this.drawHazards();
    this.drawTargets();
    this.drawLine();
    this.drawEffects();
  }

  private drawBounceBoundaries() {
    this.graphics.lineStyle(2, 0x314158, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(0, 2);
    this.graphics.lineTo(GAME_WIDTH, 2);
    this.graphics.moveTo(0, GAME_HEIGHT - 2);
    this.graphics.lineTo(GAME_WIDTH, GAME_HEIGHT - 2);
    this.graphics.strokePath();
  }

  private drawHazards() {
    const puzzle = this.puzzles[this.activePuzzleIndex];
    if (!puzzle) return;

    for (const hazard of puzzle.hazards) {
      this.graphics.fillStyle(0x020617, 1);
      this.graphics.fillCircle(hazard.x, hazard.y, hazard.r + 6);
      this.graphics.lineStyle(2, 0x334155, 0.8);
      this.graphics.strokeCircle(hazard.x, hazard.y, hazard.r + 3);
      this.graphics.fillStyle(0x000000, 1);
      this.graphics.fillCircle(hazard.x, hazard.y, hazard.r);
    }
  }

  private drawTargets() {
    for (const target of this.activeTargets) {
      this.graphics.fillStyle(0x67e8f9, 0.2);
      this.graphics.fillCircle(target.x, target.y, target.r + 8);
      this.graphics.fillStyle(0x38bdf8, 1);
      this.graphics.fillCircle(target.x, target.y, target.r);
      this.graphics.lineStyle(2, 0xe0f2fe, 0.9);
      this.graphics.strokeCircle(target.x, target.y, target.r - 4);
    }
  }

  private drawLine() {
    let pathToRender: Point[] = [];

    if (this.state === 'drawing') {
      pathToRender = this.displayPath;
    } else if (this.snakePath.length > 0) {
      const tailIndex = Math.max(0, this.headIndex - this.snakeLength + 1);
      pathToRender = this.snakePath.slice(tailIndex, this.headIndex + 1);
    }

    if (pathToRender.length < 2) return;

    this.graphics.lineStyle(LINE_WIDTH + 4, 0x67e8f9, 0.15);
    this.graphics.beginPath();
    this.graphics.moveTo(pathToRender[0]!.x, pathToRender[0]!.y);
    for (let i = 1; i < pathToRender.length; i++) {
      const point = pathToRender[i] as Point;
      this.graphics.lineTo(point.x, point.y);
    }
    this.graphics.strokePath();

    this.graphics.lineStyle(LINE_WIDTH, 0xf8fafc, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(pathToRender[0]!.x, pathToRender[0]!.y);
    for (let i = 1; i < pathToRender.length; i++) {
      const point = pathToRender[i] as Point;
      this.graphics.lineTo(point.x, point.y);
    }
    this.graphics.strokePath();
  }

  private drawEffects() {
    for (const pop of this.popEffects) {
      const progress = pop.age / pop.maxAge;
      const radius = 10 + progress * 18;
      const alpha = 1 - progress;
      this.graphics.lineStyle(3, 0xfef08a, alpha);
      this.graphics.strokeCircle(pop.x, pop.y, radius);
    }

    if (this.failureEffect) {
      const progress = this.failureEffect.age / this.failureEffect.maxAge;
      const radius = this.failureEffect.radius + progress * 28;
      const alpha = 1 - progress;
      this.graphics.fillStyle(0x020617, alpha * 0.8);
      this.graphics.fillCircle(this.failureEffect.x, this.failureEffect.y, radius);
      this.graphics.lineStyle(3, 0x94a3b8, alpha * 0.75);
      this.graphics.strokeCircle(this.failureEffect.x, this.failureEffect.y, radius);
    }

    if (this.flashAlpha > 0) {
      this.graphics.fillStyle(0xffffff, this.flashAlpha);
      this.graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    }
  }

  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (this.state !== 'drawing') return;
    if (this.activePointerId !== null) return;

    this.activePointerId = pointer.id;
    this.currentAttemptStartMs = this.time.now - this.runStartTime;
    const point = { x: pointer.x, y: pointer.y };
    this.rawPath = [point];
    this.displayPath = [point];
    this.rawPointSamples = [
      {
        x: point.x,
        y: point.y,
        t: this.currentAttemptStartMs,
      },
    ];
    this.renderScene();
  }

  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (this.state !== 'drawing') return;
    if (this.activePointerId !== pointer.id) return;
    if (this.rawPath.length === 0) return;

    const previous = this.rawPath[this.rawPath.length - 1] as Point;
    const next = { x: pointer.x, y: pointer.y };
    if (Phaser.Math.Distance.Between(previous.x, previous.y, next.x, next.y) < 2) return;

    this.rawPath.push(next);
    this.rawPointSamples.push({
      x: next.x,
      y: next.y,
      t: this.time.now - this.runStartTime,
    });
    this.displayPath = smoothPath(this.rawPath, 1);
    this.renderScene();
  }

  private onPointerUp(pointer: Phaser.Input.Pointer) {
    if (this.state !== 'drawing') return;
    if (this.activePointerId !== pointer.id) return;

    this.activePointerId = null;
    if (this.rawPath.length === 0) return;

    const smoothGesture = smoothPath(this.rawPath, 2);
    const gestureLength = polylineLength(smoothGesture);
    const normalized = normalizePath(smoothGesture, STEP_SIZE);

    if (normalized.length < MIN_GESTURE_POINTS || gestureLength < MIN_GESTURE_LENGTH) {
      this.rawPath = [];
      this.displayPath = [];
      this.rawPointSamples = [];
      this.renderScene();
      return;
    }

    this.pendingAttempt = {
      puzzleIndex: this.activePuzzleIndex,
      startedAtMs: this.currentAttemptStartMs,
      releaseTimestampMs: this.time.now - this.runStartTime,
      pointCount: this.rawPointSamples.length,
      pathLength: Math.round(gestureLength),
      points: [...this.rawPointSamples],
    };
    this.baseGesture = normalized;
    this.snakeLength = normalized.length;
    this.snakePath = [...normalized];
    this.headIndex = normalized.length - 1;
    this.yDir = 1;
    this.accumulatedSteps = 0;
    this.state = 'locomotion';
    this.displayPath = [...normalized];
    this.renderScene();
  }

  private registerTargetPop(target: PuzzleShape) {
    this.popEffects.push({
      x: target.x,
      y: target.y,
      age: 0,
      maxAge: 220,
    });
  }

  private failPuzzle(hitPoint?: Point, reason: FailureReason = 'hazard') {
    if (this.state === 'resolving-failure' || this.state === 'finished') return;

    this.state = 'resolving-failure';
    this.finalizePendingAttempt('failure');
    this.failureEvents.push({
      puzzleIndex: this.activePuzzleIndex,
      timestampMs: Math.max(0, Math.round(this.time.now - this.runStartTime)),
      reason,
    });
    this.combo = 0;
    this.callbacks.onScoreChange(this.score, this.combo);
    this.cameras.main.shake(180, 0.008);

    if (hitPoint) {
      this.failureEffect = {
        x: hitPoint.x,
        y: hitPoint.y,
        radius: 12,
        age: 0,
        maxAge: 320,
      };
    }

    this.time.delayedCall(320, () => {
      if (this.state === 'finished') return;
      this.loadPuzzle(this.activePuzzleIndex);
    });
  }

  private succeedPuzzle() {
    if (this.state === 'resolving-success' || this.state === 'finished') return;

    const solveTime = this.time.now - this.puzzleStartTime;
    const result = calculatePuzzleScore(this.activePuzzleIndex, solveTime, this.combo);

    this.state = 'resolving-success';
    this.finalizePendingAttempt('success');
    this.solveEvents.push({
      puzzleIndex: this.activePuzzleIndex,
      solveTimeMs: Math.round(solveTime),
      timestampMs: Math.max(0, Math.round(this.time.now - this.runStartTime)),
    });
    this.score += result.totalScore;
    this.combo += 1;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    this.puzzlesSolved += 1;
    this.flashAlpha = 0.35;
    this.callbacks.onScoreChange(this.score, this.combo);

    this.time.delayedCall(220, () => {
      this.activePuzzleIndex++;
      this.loadPuzzle(this.activePuzzleIndex);
    });
  }

  override update(_time: number, delta: number) {
    if (
      this.state === 'drawing' ||
      this.state === 'locomotion' ||
      this.state === 'resolving-success' ||
      this.state === 'resolving-failure'
    ) {
      this.timeRemainingMs -= delta;
      if (this.timeRemainingMs <= 0) {
        this.timeRemainingMs = 0;
        this.finishGame();
      }
      this.callbacks.onTimeChange(this.timeRemainingMs);
    }

    this.updateEffects(delta);

    if (this.state !== 'locomotion') {
      this.renderScene();
      return;
    }

    const distanceToMove = (SNAKE_SPEED * delta) / 1000;
    this.accumulatedSteps += distanceToMove / STEP_SIZE;

    const steps = Math.floor(this.accumulatedSteps);
    if (steps <= 0) {
      this.renderScene();
      return;
    }

    this.accumulatedSteps -= steps;

    for (let s = 0; s < steps; s++) {
      const baseIndex = this.headIndex % (this.baseGesture.length - 1);
      const from = this.baseGesture[baseIndex] as Point;
      const to = this.baseGesture[baseIndex + 1] as Point;

      const deltaX = to.x - from.x;
      const deltaY = to.y - from.y;

      const currentHead = this.snakePath[this.headIndex] as Point;
      const nextPoint = this.applyBounce({
        x: currentHead.x + deltaX,
        y: currentHead.y + deltaY * this.yDir,
      });

      this.headIndex++;
      this.snakePath[this.headIndex] = nextPoint;
    }

    const tailIndex = Math.max(0, this.headIndex - this.snakeLength + 1);
    const puzzle = this.puzzles[this.activePuzzleIndex];
    if (!puzzle) return;

    let hazardHit: Point | null = null;

    for (let i = tailIndex; i < this.headIndex; i++) {
      const s1 = this.snakePath[i] as Point;
      const s2 = this.snakePath[i + 1] as Point;

      for (const hazard of puzzle.hazards) {
        if (segmentIntersectsCircle(s1, s2, hazard, hazard.r)) {
          hazardHit = { x: hazard.x, y: hazard.y };
          break;
        }
      }
      if (hazardHit) break;

      for (let tIndex = this.activeTargets.length - 1; tIndex >= 0; tIndex--) {
        const target = this.activeTargets[tIndex] as PuzzleShape;
        if (segmentIntersectsCircle(s1, s2, target, target.r)) {
          this.registerTargetPop(target);
          this.activeTargets.splice(tIndex, 1);
        }
      }
    }

    if (hazardHit) {
      this.failPuzzle(hazardHit, 'hazard');
      this.renderScene();
      return;
    }

    if (this.activeTargets.length === 0) {
      this.succeedPuzzle();
      this.renderScene();
      return;
    }

    if (!this.isAnyBodyPointVisible(tailIndex)) {
      this.failPuzzle(this.snakePath[this.headIndex], 'escape');
      this.renderScene();
      return;
    }

    this.renderScene();
  }

  private finalizePendingAttempt(outcome: GestureAttempt['outcome']) {
    if (!this.pendingAttempt) return;

    this.attempts.push({
      ...this.pendingAttempt,
      outcome,
    });
    this.pendingAttempt = null;
  }

  private applyBounce(point: Point): Point {
    const { x } = point;
    let { y } = point;

    while (y < 0 || y > GAME_HEIGHT) {
      if (y < 0) {
        y = -y;
        this.yDir *= -1;
      } else if (y > GAME_HEIGHT) {
        y = GAME_HEIGHT - (y - GAME_HEIGHT);
        this.yDir *= -1;
      }
    }

    return { x, y };
  }

  private isAnyBodyPointVisible(tailIndex: number): boolean {
    for (let i = tailIndex; i <= this.headIndex; i++) {
      const point = this.snakePath[i] as Point;
      if (point.x >= -OFFSCREEN_MARGIN && point.x <= GAME_WIDTH + OFFSCREEN_MARGIN) {
        return true;
      }
    }
    return false;
  }

  private updateEffects(delta: number) {
    this.popEffects = this.popEffects
      .map((effect) => ({ ...effect, age: effect.age + delta }))
      .filter((effect) => effect.age < effect.maxAge);

    if (this.failureEffect) {
      this.failureEffect = {
        ...this.failureEffect,
        age: this.failureEffect.age + delta,
      };
      if (this.failureEffect.age >= this.failureEffect.maxAge) {
        this.failureEffect = null;
      }
    }

    if (this.flashAlpha > 0) {
      this.flashAlpha = Math.max(0, this.flashAlpha - delta / 450);
    }
  }

  private finishGame() {
    if (this.state === 'finished') return;

    this.state = 'finished';
    this.graphics.clear();
    this.input.removeAllListeners();
    this.activeCountdownText?.destroy();
    this.callbacks.onFinish({
      score: this.score,
      puzzlesSolved: this.puzzlesSolved,
      maxCombo: this.maxCombo,
    }, {
      attempts: [...this.attempts],
      solveEvents: [...this.solveEvents],
      failureEvents: [...this.failureEvents],
      summary: {
        score: this.score,
        puzzlesSolved: this.puzzlesSolved,
        maxCombo: this.maxCombo,
        totalRunMs: Math.max(0, Math.round(this.time.now - this.runStartTime)),
      },
    });
  }
}

export function createGame(parent: HTMLElement, seed: string, callbacks: GameCallbacks): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: '#0f172a',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  const game = new Phaser.Game(config);
  game.scene.add('DailyLineScene', DailyLineScene, true, { seed, callbacks });

  return game;
}
