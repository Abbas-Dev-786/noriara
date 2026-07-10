import type Phaser from 'phaser';
import { generatePuzzlesForSeed, PuzzleLayout, PuzzleShape } from '../shared/puzzle';
import { calculatePuzzleScore } from '../shared/scoring';
import { DEFAULT_GAME_SETTINGS, type GameSettings } from './gameSettings';
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

type PhaserModule = typeof Phaser;

export interface GameCallbacks {
  onScoreChange: (score: number, combo: number) => void;
  onTimeChange: (timeMs: number) => void;
  onFinish: (
    result: { score: number; puzzlesSolved: number; maxCombo: number },
    telemetry: RunTelemetry
  ) => void;
  onReady: (scene: Phaser.Scene & { startCountdown: () => void; updateSettings: (settings: GameSettings) => void }) => void;
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

type ParticleEffect = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  color: number;
};

type PendingAttempt = {
  puzzleIndex: number;
  startedAtMs: number;
  releaseTimestampMs: number;
  pointCount: number;
  pathLength: number;
  points: GesturePointSample[];
};

function createDailyLineScene(Phaser: PhaserModule) {
  return class DailyLineScene extends Phaser.Scene {
  private callbacks!: GameCallbacks;
  private seed!: string;
  private settings: GameSettings = DEFAULT_GAME_SETTINGS;

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
  private particles: ParticleEffect[] = [];
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

  init(data: { seed: string; callbacks: GameCallbacks; settings?: GameSettings }) {
    this.seed = data.seed;
    this.callbacks = data.callbacks;
    this.settings = data.settings ?? DEFAULT_GAME_SETTINGS;
  }

  create() {
    this.graphics = this.add.graphics();
    this.puzzles = generatePuzzlesForSeed(this.seed);

    this.input.on('pointerdown', this.onPointerDown, this);
    this.input.on('pointermove', this.onPointerMove, this);
    this.input.on('pointerup', this.onPointerUp, this);

    this.callbacks.onReady(this as unknown as Phaser.Scene & {
      startCountdown: () => void;
      updateSettings: (settings: GameSettings) => void;
    });
    this.renderScene();
  }

  public updateSettings(settings: GameSettings) {
    this.settings = settings;
    this.renderScene();
  }

  public startCountdown() {
    if (this.state !== 'waiting') return;

    this.state = 'countdown';
    let count = 3;
    this.activeCountdownText = this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY, '3', {
        fontSize: '64px',
        color: '#1e293b',
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
          this.playTone(740, 0.05, 0.018);
          this.vibrate(14);
        } else if (count === 0) {
          this.activeCountdownText.setText('GO!');
          this.playTone(980, 0.08, 0.03);
          this.vibrate(20);
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
    this.particles = [];
    this.flashAlpha = 0;
  }

  private renderScene() {
    const palette = this.getPalette();
    this.graphics.clear();

    this.graphics.fillStyle(palette.background, 1);
    this.graphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.drawGrid();
    this.drawBounceBoundaries();
    this.drawHazards();
    this.drawTargets();
    this.drawLine();
    this.drawEffects();
  }

  private drawGrid() {
    const palette = this.getPalette();
    this.graphics.fillStyle(palette.boundary, this.settings.highContrast ? 0.3 : 0.15);
    for (let x = 20; x < GAME_WIDTH; x += 20) {
      for (let y = 20; y < GAME_HEIGHT; y += 20) {
        this.graphics.fillRect(x - 1, y - 1, 2, 2);
      }
    }
  }

  private drawBounceBoundaries() {
    const palette = this.getPalette();
    this.graphics.lineStyle(this.settings.highContrast ? 3 : 2, palette.boundary, 1);
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
    const palette = this.getPalette();

    for (const hazard of puzzle.hazards) {
      this.graphics.fillStyle(palette.hazardAura, 1);
      this.graphics.fillCircle(hazard.x, hazard.y, hazard.r + 6);
      this.graphics.lineStyle(this.settings.highContrast ? 3 : 2, palette.hazardRing, 0.9);
      this.graphics.strokeCircle(hazard.x, hazard.y, hazard.r + 3);
      this.graphics.fillStyle(palette.hazardCore, 1);
      this.graphics.fillCircle(hazard.x, hazard.y, hazard.r);
    }
  }

  private drawTargets() {
    const palette = this.getPalette();
    const pulseScale = this.settings.reducedMotion ? 1 : 1 + Math.sin(this.time.now / 150) * 0.08;
    
    for (const target of this.activeTargets) {
      this.graphics.fillStyle(palette.targetGlow, this.settings.highContrast ? 0.32 : 0.2);
      this.graphics.fillCircle(target.x, target.y, (target.r + 8) * pulseScale);
      this.graphics.fillStyle(palette.targetFill, 1);
      this.graphics.fillCircle(target.x, target.y, target.r * pulseScale);
      this.graphics.lineStyle(this.settings.highContrast ? 3 : 2, palette.targetRing, 0.95);
      this.graphics.strokeCircle(target.x, target.y, (target.r - 4) * pulseScale);
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

    const palette = this.getPalette();

    // Outer glow pass — subtle shadow
    this.graphics.lineStyle(LINE_WIDTH + (this.settings.highContrast ? 5 : 4), palette.lineGlow, this.settings.highContrast ? 0.34 : 0.12);
    this.graphics.beginPath();
    this.graphics.moveTo(pathToRender[0]!.x, pathToRender[0]!.y);
    for (let i = 1; i < pathToRender.length; i++) {
      const point = pathToRender[i] as Point;
      this.graphics.lineTo(point.x, point.y);
    }
    this.graphics.strokePath();

    // Core line
    this.graphics.lineStyle(this.settings.highContrast ? LINE_WIDTH + 1 : LINE_WIDTH, palette.lineCore, 1);
    this.graphics.beginPath();
    this.graphics.moveTo(pathToRender[0]!.x, pathToRender[0]!.y);
    for (let i = 1; i < pathToRender.length; i++) {
      const point = pathToRender[i] as Point;
      this.graphics.lineTo(point.x, point.y);
    }
    this.graphics.strokePath();

    // Draw round caps at start and end
    const headPt = pathToRender[pathToRender.length - 1]!;
    const tailPt = pathToRender[0]!;
    const halfW = (this.settings.highContrast ? LINE_WIDTH + 1 : LINE_WIDTH) / 2;
    this.graphics.fillStyle(palette.lineCore, 1);
    this.graphics.fillCircle(tailPt.x, tailPt.y, halfW);
    this.graphics.fillCircle(headPt.x, headPt.y, halfW);

    // Head glow during locomotion
    if (this.state === 'locomotion' && !this.settings.reducedMotion) {
      const headPulse = 1 + Math.sin(this.time.now / 100) * 0.15;
      this.graphics.fillStyle(palette.lineGlow, 0.45);
      this.graphics.fillCircle(headPt.x, headPt.y, LINE_WIDTH * 1.4 * headPulse);
    }
  }

  private drawEffects() {
    const palette = this.getPalette();
    
    for (const p of this.particles) {
      const alpha = 1 - (p.age / p.maxAge);
      this.graphics.fillStyle(p.color, alpha);
      this.graphics.fillCircle(p.x, p.y, 3);
    }

    for (const pop of this.popEffects) {
      const progress = pop.age / pop.maxAge;
      const radius = 10 + progress * 18;
      const alpha = 1 - progress;
      this.graphics.lineStyle(this.settings.highContrast ? 4 : 3, palette.pop, alpha);
      this.graphics.strokeCircle(pop.x, pop.y, radius);
    }

    if (this.failureEffect) {
      const progress = this.failureEffect.age / this.failureEffect.maxAge;
      const radius = this.failureEffect.radius + progress * 28;
      const alpha = 1 - progress;
      this.graphics.fillStyle(palette.failureFill, alpha * 0.8);
      this.graphics.fillCircle(this.failureEffect.x, this.failureEffect.y, radius);
      this.graphics.lineStyle(this.settings.highContrast ? 4 : 3, palette.failureRing, alpha * 0.8);
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
    if (Phaser.Math.Distance.Between(previous.x, previous.y, next.x, next.y) < 1.5) return;

    this.rawPath.push(next);
    this.rawPointSamples.push({
      x: next.x,
      y: next.y,
      t: this.time.now - this.runStartTime,
    });
    this.displayPath = smoothPath(this.rawPath, 2);
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
    if (!this.settings.reducedMotion) {
      this.popEffects.push({
        x: target.x,
        y: target.y,
        age: 0,
        maxAge: 220,
      });

      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.2;
        const speed = 60 + Math.random() * 40;
        this.particles.push({
          x: target.x,
          y: target.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          age: 0,
          maxAge: 400 + Math.random() * 200,
          color: this.getPalette().targetFill,
        });
      }
    }
    this.playTone(880, 0.06, 0.02);
    this.vibrate(16);
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
    if (!this.settings.reducedMotion) {
      this.cameras.main.shake(180, 0.008);
    }
    this.playTone(180, 0.18, 0.045);
    this.vibrate(26);

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
    this.flashAlpha = this.settings.reducedMotion ? 0.12 : 0.35;
    this.playTone(620, 0.09, 0.03);
    this.playTone(780, 0.12, 0.025, 55);
    this.vibrate(18);
    this.callbacks.onScoreChange(this.score, this.combo);

    if (!this.settings.reducedMotion) {
      const scoreText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `+${result.totalScore}`, {
        fontSize: '36px',
        color: '#10b981',
        fontStyle: 'bold',
        fontFamily: 'Inter',
      }).setOrigin(0.5);

      this.tweens.add({
        targets: scoreText,
        y: GAME_HEIGHT / 2 - 60,
        alpha: 0,
        duration: 1200,
        ease: 'Cubic.easeOut',
        onComplete: () => scoreText.destroy()
      });
    }

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
    const collisionStartIndex = Math.max(tailIndex, this.baseGesture.length - 1);
    const puzzle = this.puzzles[this.activePuzzleIndex];
    if (!puzzle) return;

    let hazardHit: Point | null = null;

    for (let i = collisionStartIndex; i < this.headIndex; i++) {
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

    this.particles = this.particles
      .map((p) => ({
        ...p,
        x: p.x + (p.vx * delta) / 1000,
        y: p.y + (p.vy * delta) / 1000,
        age: p.age + delta,
      }))
      .filter((p) => p.age < p.maxAge);

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
    this.playTone(520, 0.14, 0.025);
    this.playTone(390, 0.2, 0.022, 65);
    this.vibrate(24);
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

  private getPalette() {
    if (this.settings.highContrast) {
      return {
        background: 0x050608,
        boundary: 0xffffff,
        hazardAura: 0x282c38,
        hazardRing: 0xffffff,
        hazardCore: 0x000000,
        targetGlow: 0xff80a0,
        targetFill: 0xff2050,
        targetRing: 0xffffff,
        lineGlow: 0xffffff,
        lineCore: 0x000000,
        pop: 0xffd050,
        failureFill: 0x000000,
        failureRing: 0xff0000,
      };
    }

    return {
      background: 0xf8fafc,
      boundary: 0xcbd5e1,
      hazardAura: 0xfee2e2,
      hazardRing: 0xf87171,
      hazardCore: 0xef4444,
      targetGlow: 0xc7d2fe,
      targetFill: 0x6366f1,
      targetRing: 0xffffff,
      lineGlow: 0x64748b,
      lineCore: 0x0f172a,
      pop: 0x10b981,
      failureFill: 0xfecaca,
      failureRing: 0xef4444,
    };
  }

  private playTone(frequency: number, durationSeconds: number, volume: number, delayMs: number = 0) {
    if (!this.settings.soundEnabled) return;
    const AudioContextCtor = globalThis.AudioContext;
    if (!AudioContextCtor) return;

    try {
      const audioContext = new AudioContextCtor();
      const now = audioContext.currentTime + delayMs / 1000;
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, now);
      gainNode.gain.setValueAtTime(0.0001, now);
      gainNode.gain.exponentialRampToValueAtTime(volume, now + 0.01);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSeconds);

      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      oscillator.start(now);
      oscillator.stop(now + durationSeconds + 0.02);
      oscillator.onended = () => {
        void audioContext.close();
      };
    } catch {
      // Best-effort only.
    }
  }

  private vibrate(durationMs: number) {
    if (!this.settings.hapticsEnabled) return;
    if (typeof navigator === 'undefined' || typeof navigator.vibrate !== 'function') return;

    try {
      navigator.vibrate(durationMs);
    } catch {
      // Best-effort only.
    }
  }
  };
}

export async function createGame(
  parent: HTMLElement,
  seed: string,
  callbacks: GameCallbacks,
  settings: GameSettings
): Promise<Phaser.Game> {
  const { default: Phaser } = await import('phaser');
  const DailyLineScene = createDailyLineScene(Phaser);
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_WIDTH,
    height: GAME_HEIGHT,
    parent,
    backgroundColor: '#f8fafc',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  const game = new Phaser.Game(config);
  game.scene.add('DailyLineScene', DailyLineScene, true, { seed, callbacks, settings });

  return game;
}

export async function preloadGameRuntime(): Promise<void> {
  await import('phaser');
}
