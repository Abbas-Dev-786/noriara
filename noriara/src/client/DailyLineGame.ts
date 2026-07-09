import Phaser from 'phaser';
import { generatePuzzlesForSeed, PuzzleLayout, PuzzleShape } from '../shared/puzzle';
import { calculatePuzzleScore } from '../shared/scoring';
import { segmentIntersectsCircle, Point, normalizePath } from '../shared/geom';

export interface GameCallbacks {
  onScoreChange: (score: number, combo: number) => void;
  onTimeChange: (timeMs: number) => void;
  onFinish: (result: { score: number; puzzlesSolved: number; maxCombo: number }) => void;
  onReady: (scene: Phaser.Scene & { startCountdown: () => void }) => void;
}

const STEP_SIZE = 3;
const SNAKE_SPEED = 300; // pixels per second

class DailyLineScene extends Phaser.Scene {
  private callbacks!: GameCallbacks;
  private seed!: string;
  
  private puzzles: PuzzleLayout[] = [];
  private activePuzzleIndex = 0;
  
  private state: 'waiting' | 'countdown' | 'drawing' | 'locomotion' | 'finished' = 'waiting';
  private timeRemainingMs = 30000;
  
  private score = 0;
  private combo = 0;
  private maxCombo = 0;
  private puzzlesSolved = 0;
  
  private puzzleStartTime = 0;
  
  private rawPath: Point[] = [];
  
  private snakePath: Point[] = [];
  private baseGesture: Point[] = [];
  private snakeLength = 0;
  private headIndex = 0;
  private yDir = 1;
  private accumulatedSteps = 0;
  
  private activeTargets: PuzzleShape[] = [];
  
  private graphics!: Phaser.GameObjects.Graphics;
  
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
  }
  
  public startCountdown() {
    this.state = 'countdown';
    let count = 3;
    const text = this.add.text(this.cameras.main.centerX, this.cameras.main.centerY, '3', { fontSize: '64px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    
    this.time.addEvent({
      delay: 1000,
      repeat: 3,
      callback: () => {
        count--;
        if (count > 0) {
          text.setText(count.toString());
        } else if (count === 0) {
          text.setText('GO!');
        } else {
          text.destroy();
          this.startGame();
        }
      }
    });
  }
  
  private startGame() {
    this.state = 'drawing';
    this.puzzleStartTime = this.time.now;
    this.loadPuzzle(this.activePuzzleIndex);
  }
  
  private loadPuzzle(index: number) {
    this.graphics.clear();
    this.rawPath = [];
    this.snakePath = [];
    this.baseGesture = [];
    this.yDir = 1;
    this.accumulatedSteps = 0;
    
    const puzzle = this.puzzles[index];
    if (!puzzle) {
      this.finishGame();
      return;
    }
    
    this.activeTargets = [...puzzle.targets];
    this.state = 'drawing';
    this.renderScene();
  }
  
  private renderScene() {
    this.graphics.clear();
    const puzzle = this.puzzles[this.activePuzzleIndex];
    if (!puzzle) return;
    
    // Draw hazards (black holes)
    this.graphics.fillStyle(0x000000, 1);
    this.graphics.lineStyle(2, 0x333333, 1);
    for (const h of puzzle.hazards) {
      this.graphics.fillCircle(h.x, h.y, h.r);
      this.graphics.strokeCircle(h.x, h.y, h.r);
    }
    
    // Draw active targets (colored circles)
    this.graphics.fillStyle(0x4488ff, 1); // Blue targets
    for (const t of this.activeTargets) {
      this.graphics.fillCircle(t.x, t.y, t.r);
    }
    
    // Draw path
    this.graphics.lineStyle(5, 0xffffff, 1);
    this.graphics.beginPath();
    
    if (this.state === 'drawing' && this.rawPath.length > 0) {
      const startP = this.rawPath[0] as Point;
      this.graphics.moveTo(startP.x, startP.y);
      for (let i = 1; i < this.rawPath.length; i++) {
        const p = this.rawPath[i] as Point;
        this.graphics.lineTo(p.x, p.y);
      }
      this.graphics.strokePath();
    } else if (this.state === 'locomotion' && this.snakePath.length > 0) {
      const tailIndex = Math.max(0, this.headIndex - this.snakeLength + 1);
      const startPoint = this.snakePath[tailIndex] as Point;
      this.graphics.moveTo(startPoint.x, startPoint.y);
      for (let i = tailIndex + 1; i <= this.headIndex; i++) {
        const p = this.snakePath[i] as Point;
        this.graphics.lineTo(p.x, p.y);
      }
      this.graphics.strokePath();
    }
  }
  
  private onPointerDown(pointer: Phaser.Input.Pointer) {
    if (this.state !== 'drawing') return;
    this.rawPath = [{ x: pointer.x, y: pointer.y }];
  }
  
  private onPointerMove(pointer: Phaser.Input.Pointer) {
    if (this.state !== 'drawing' || this.rawPath.length === 0) return;
    const p = { x: pointer.x, y: pointer.y };
    this.rawPath.push(p);
    
    const puzzle = this.puzzles[this.activePuzzleIndex];
    if (puzzle && this.rawPath.length >= 2) {
      const p1 = this.rawPath[this.rawPath.length - 2] as Point;
      const p2 = p;
      for (const h of puzzle.hazards) {
        if (segmentIntersectsCircle(p1, p2, h, h.r)) {
          this.failPuzzle();
          return;
        }
      }
    }
    
    this.renderScene();
  }
  
  private onPointerUp() {
    if (this.state !== 'drawing' || this.rawPath.length === 0) return;
    
    const base = normalizePath(this.rawPath, STEP_SIZE);
    if (base.length < 5) {
      // Gesture too short, reset
      this.rawPath = [];
      this.renderScene();
      return;
    }
    
    this.baseGesture = base;
    this.snakeLength = base.length;
    this.snakePath = [...base];
    this.headIndex = this.snakeLength - 1;
    this.yDir = 1;
    this.accumulatedSteps = 0;
    this.state = 'locomotion';
  }
  
  private failPuzzle() {
    this.state = 'drawing';
    this.rawPath = [];
    this.combo = 0;
    this.callbacks.onScoreChange(this.score, this.combo);
    this.cameras.main.shake(200, 0.01);
    this.time.delayedCall(300, () => {
      if (this.state === 'drawing') this.loadPuzzle(this.activePuzzleIndex);
    });
  }
  
  private succeedPuzzle() {
    const solveTime = this.time.now - this.puzzleStartTime;
    const result = calculatePuzzleScore(this.activePuzzleIndex, solveTime, this.combo);
    
    this.score += result.totalScore;
    this.combo += 1;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    this.puzzlesSolved += 1;
    
    this.callbacks.onScoreChange(this.score, this.combo);
    this.cameras.main.flash(200, 255, 255, 255);
    
    this.activePuzzleIndex++;
    this.puzzleStartTime = this.time.now;
    this.loadPuzzle(this.activePuzzleIndex);
  }
  
  override update(_time: number, delta: number) {
    if (this.state === 'drawing' || this.state === 'locomotion') {
      this.timeRemainingMs -= delta;
      if (this.timeRemainingMs <= 0) {
        this.timeRemainingMs = 0;
        this.finishGame();
      }
      this.callbacks.onTimeChange(this.timeRemainingMs);
    }
    
    if (this.state === 'locomotion') {
      const distanceToMove = (SNAKE_SPEED * delta) / 1000;
      this.accumulatedSteps += distanceToMove / STEP_SIZE;
      
      const steps = Math.floor(this.accumulatedSteps);
      if (steps > 0) {
        this.accumulatedSteps -= steps;
        
        for (let s = 0; s < steps; s++) {
          const baseIndex = this.headIndex % (this.baseGesture.length - 1);
          const p1 = this.baseGesture[baseIndex] as Point;
          const p2 = this.baseGesture[baseIndex + 1] as Point;
          
          const deltaX = p2.x - p1.x;
          const deltaY = p2.y - p1.y;
          
          const currHead = this.snakePath[this.headIndex] as Point;
          const nextX = currHead.x + deltaX;
          let nextY = currHead.y + deltaY * this.yDir;
          
          // Bounce top/bottom
          if (nextY < 0) {
            this.yDir *= -1;
            nextY = currHead.y + deltaY * this.yDir;
          } else if (nextY > 400) {
            this.yDir *= -1;
            nextY = currHead.y + deltaY * this.yDir;
          }
          
          this.headIndex++;
          this.snakePath[this.headIndex] = { x: nextX, y: nextY };
        }
        
        // Evaluate collisions
        const tailIndex = Math.max(0, this.headIndex - this.snakeLength + 1);
        const puzzle = this.puzzles[this.activePuzzleIndex];
        
        if (!puzzle) return;

        let hitHazard = false;
        
        for (let i = tailIndex; i < this.headIndex; i++) {
          const s1 = this.snakePath[i] as Point;
          const s2 = this.snakePath[i+1] as Point;
          
          // Hazards
          for (const h of puzzle.hazards) {
            if (segmentIntersectsCircle(s1, s2, h, h.r)) {
              hitHazard = true;
              break;
            }
          }
          if (hitHazard) break;
          
          // Targets
          for (let tIndex = this.activeTargets.length - 1; tIndex >= 0; tIndex--) {
            const t = this.activeTargets[tIndex] as PuzzleShape;
            if (segmentIntersectsCircle(s1, s2, t, t.r)) {
              this.activeTargets.splice(tIndex, 1);
            }
          }
        }
        
        if (hitHazard) {
          this.failPuzzle();
          return;
        }
        
        if (this.activeTargets.length === 0) {
          this.succeedPuzzle();
          return;
        }
        
        // Check out of bounds (escaped screen left/right)
        let isVisible = false;
        for (let i = tailIndex; i <= this.headIndex; i++) {
          const p = this.snakePath[i] as Point;
          if (p.x >= -50 && p.x <= 650) {
            isVisible = true;
            break;
          }
        }
        
        if (!isVisible && this.activeTargets.length > 0) {
          this.failPuzzle();
          return;
        }
        
        this.renderScene();
      }
    }
  }
  
  private finishGame() {
    this.state = 'finished';
    this.graphics.clear();
    this.input.removeAllListeners();
    this.callbacks.onFinish({
      score: this.score,
      puzzlesSolved: this.puzzlesSolved,
      maxCombo: this.maxCombo
    });
  }
}

export function createGame(parent: HTMLElement, seed: string, callbacks: GameCallbacks): Phaser.Game {
  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: 600,
    height: 400,
    parent: parent,
    backgroundColor: '#111827',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
  };

  const game = new Phaser.Game(config);
  game.scene.add('DailyLineScene', DailyLineScene, true, { seed, callbacks });
  
  return game;
}
