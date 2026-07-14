import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

/* Animated background canvas */



interface SnakeSegment {
  x: number;
  y: number;
}

function catmullRom(p0: number, p1: number, p2: number, p3: number, t: number): number {
  return 0.5 * (
    (2 * p1) +
    (-p0 + p2) * t +
    (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t +
    (-p0 + 3 * p1 - 3 * p2 + p3) * t * t * t
  );
}

function createSnake(w: number, h: number): SnakeSegment[] {
  // Order of points matching TARGETS_CONFIG to form a nice loop
  const pctPoints = [
    { x: 12, y: 15 }, // Target 0
    { x: 50, y: 8 },  // Target 5
    { x: 82, y: 20 }, // Target 1
    { x: 85, y: 72 }, // Target 3
    { x: 22, y: 80 }, // Target 4
    { x: 8, y: 55 }   // Target 2
  ];

  // Convert percentages to pixel positions
  const pixelPoints = pctPoints.map(p => ({
    x: (p.x / 100) * w,
    y: (p.y / 100) * h
  }));

  const segments: SnakeSegment[] = [];
  const numPts = pixelPoints.length;
  const stepsPerSegment = 50; // Total points = 6 * 50 = 300 for smooth transitions

  for (let i = 0; i < numPts; i++) {
    const p0 = pixelPoints[(i - 1 + numPts) % numPts]!;
    const p1 = pixelPoints[i]!;
    const p2 = pixelPoints[(i + 1) % numPts]!;
    const p3 = pixelPoints[(i + 2) % numPts]!;

    for (let step = 0; step < stepsPerSegment; step++) {
      const t = step / stepsPerSegment;
      segments.push({
        x: catmullRom(p0.x, p1.x, p2.x, p3.x, t),
        y: catmullRom(p0.y, p1.y, p2.y, p3.y, t)
      });
    }
  }

  return segments;
}

interface SplashParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  maxAge: number;
  color: string;
}

interface SplashRipple {
  x: number;
  y: number;
  age: number;
  maxAge: number;
  color: string;
}

function useBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    snake: SnakeSegment[];
    particles: SplashParticle[];
    ripples: SplashRipple[];
    lastPoppedTargetId: number | null;
    frame: number;
    offset: number;
  } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect();
      if (!rect) return;
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      ctx.scale(dpr, dpr);
      stateRef.current = {
        snake: createSnake(rect.width, rect.height),
        particles: [],
        ripples: [],
        lastPoppedTargetId: null,
        frame: 0,
        offset: 0,
      };
    };
    resize();
    window.addEventListener('resize', resize);

    let animId: number;
    const draw = () => {
      animId = requestAnimationFrame(draw);
      const s = stateRef.current;
      if (!s) return;

      const w = canvas.width / (window.devicePixelRatio || 1);
      const h = canvas.height / (window.devicePixelRatio || 1);
      ctx.clearRect(0, 0, w, h);

      s.offset += 0.4;
      s.frame++;

      // Draw animated snake trail
      const snakeLen = s.snake.length;
      if (snakeLen > 1) {
        const visibleStart = Math.floor(s.offset) % snakeLen;
        const segCount = Math.min(60, snakeLen);

        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        for (let i = 1; i < segCount; i++) {
          const idx = (visibleStart + i) % snakeLen;
          const prevIdx = (visibleStart + i - 1) % snakeLen;
          const seg = s.snake[idx]!;
          const prev = s.snake[prevIdx]!;
          const progress = i / segCount;

          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(seg.x, seg.y);
          ctx.strokeStyle = `rgba(28, 32, 38, ${progress * 0.12})`;
          ctx.lineWidth = 3 + progress * 2;
          ctx.stroke();
        }

        // Snake head dot
        const headIdx = (visibleStart + segCount - 1) % snakeLen;
        const head = s.snake[headIdx]!;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(28, 32, 38, 0.18)';
        ctx.fill();

        // Target touch detection (same game logic)
        const pixelTargets = TARGETS_CONFIG.map(t => ({
          id: t.id,
          x: (t.x / 100) * w,
          y: (t.y / 100) * h,
          color: t.color
        }));

        let closestTarget = null;
        let minDistance = 9999;
        for (const pt of pixelTargets) {
          const dx = head.x - pt.x;
          const dy = head.y - pt.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 15 && dist < minDistance) {
            minDistance = dist;
            closestTarget = pt;
          }
        }

        if (closestTarget) {
          if (s.lastPoppedTargetId !== closestTarget.id) {
            s.lastPoppedTargetId = closestTarget.id;

            // Spawn bursting particles
            for (let i = 0; i < 6; i++) {
              const angle = (Math.PI * 2 * i) / 6 + Math.random() * 0.2;
              const speed = 10 + Math.random() * 15;
              s.particles.push({
                x: closestTarget.x,
                y: closestTarget.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                age: 0,
                maxAge: 30 + Math.random() * 20,
                color: closestTarget.color,
              });
            }

            // Spawn expanding ripple
            s.ripples.push({
              x: closestTarget.x,
              y: closestTarget.y,
              age: 0,
              maxAge: 25,
              color: closestTarget.color,
            });
          }
        } else {
          // Reset detection when moving away
          if (s.lastPoppedTargetId !== null) {
            const lastTarget = pixelTargets.find(t => t.id === s.lastPoppedTargetId);
            if (lastTarget) {
              const dx = head.x - lastTarget.x;
              const dy = head.y - lastTarget.y;
              const dist = Math.sqrt(dx * dx + dy * dy);
              if (dist > 35) {
                s.lastPoppedTargetId = null;
              }
            } else {
              s.lastPoppedTargetId = null;
            }
          }
        }
      }

      // Draw and update active ripples
      for (let i = s.ripples.length - 1; i >= 0; i--) {
        const r = s.ripples[i]!;
        r.age++;
        if (r.age >= r.maxAge) {
          s.ripples.splice(i, 1);
          continue;
        }
        const progress = r.age / r.maxAge;
        const radius = 10 + progress * 25;
        const alpha = (1 - progress) * 0.4;

        ctx.beginPath();
        ctx.arc(r.x, r.y, radius, 0, Math.PI * 2);
        ctx.strokeStyle = r.color.replace('0.5', `${alpha}`);
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw and update active particles (ink drop burst)
      for (let i = s.particles.length - 1; i >= 0; i--) {
        const p = s.particles[i]!;
        p.age++;
        if (p.age >= p.maxAge) {
          s.particles.splice(i, 1);
          continue;
        }

        p.x += p.vx * 0.15;
        p.y += p.vy * 0.15;
        p.vx *= 0.93;
        p.vy *= 0.93;

        const progress = p.age / p.maxAge;
        const alpha = (1 - progress) * 0.5;
        const size = 3 * (1 - progress);

        ctx.beginPath();
        ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
        ctx.fillStyle = p.color.replace('0.5', `${alpha}`);
        ctx.fill();
      }
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return canvasRef;
}

/* DOM-based targets with backdrop blur */
const TARGETS_CONFIG = [
  { id: 0, x: 12, y: 15, size: 45, color: 'rgba(43, 89, 195, 0.5)', delay: 0, animDuration: 12 },
  { id: 1, x: 82, y: 20, size: 55, color: 'rgba(46, 139, 87, 0.5)', delay: 1, animDuration: 15 },
  { id: 2, x: 8, y: 55, size: 35, color: 'rgba(200, 62, 77, 0.5)', delay: 2, animDuration: 10 },
  { id: 3, x: 85, y: 72, size: 50, color: 'rgba(43, 89, 195, 0.5)', delay: 0.5, animDuration: 14 },
  { id: 4, x: 22, y: 80, size: 40, color: 'rgba(46, 139, 87, 0.5)', delay: 1.5, animDuration: 11 },
  { id: 5, x: 50, y: 8, size: 48, color: 'rgba(200, 62, 77, 0.5)', delay: 3, animDuration: 16 }
];

const TargetLayer = () => {
  const targets = useRef(TARGETS_CONFIG).current;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden z-0">
      {targets.map((t) => (
        <div
          key={t.id}
          className="absolute rounded-full backdrop-blur-sm"
          style={{
            left: `${t.x}%`,
            top: `${t.y}%`,
            width: `${t.size}px`,
            height: `${t.size}px`,
            backgroundColor: t.color,
            animation: `float-anim ${t.animDuration}s ease-in-out infinite alternate, pulse-anim 4s ease-in-out infinite alternate`,
            animationDelay: `${t.delay}s`,
            boxShadow: 'inset 0 0 10px rgba(255,255,255,0.3)',
          }}
        />
      ))}
    </div>
  );
};

/* Splash component */

export const Splash = () => {
  const [showHowToPlay, setShowHowToPlay] = useState(false);
  const canvasRef = useBackgroundCanvas();

  return (
    <div className="app-shell relative flex min-h-screen items-center overflow-hidden px-4 py-6 sm:px-6">
      {/* Animated background */}
      <canvas
        ref={canvasRef}
        className="pointer-events-none absolute inset-0"
        style={{ opacity: 0.6 }}
      />

      <TargetLayer />

      <div className="motion-rise relative z-10 mx-auto w-full max-w-xl">
        <section className="surface-panel-strong rounded-[30px] px-6 py-8 text-center sm:px-8 sm:py-10">

          <div className="relative inline-block mt-2">
            <h1 className="display-title relative z-10 text-4xl sm:text-5xl">Noriara</h1>
            <svg
              className="absolute left-0 right-0 bottom-2 w-full h-[15px] z-0 text-slate-800 opacity-20"
              viewBox="0 0 100 20"
              preserveAspectRatio="none"
              style={{
                strokeDasharray: '100',
                strokeDashoffset: '100',
                animation: 'draw-stroke 4s cubic-bezier(0.4, 0, 0.2, 1) infinite'
              }}
            >
              <path d="M0,12 Q25,22 50,12 T100,12" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round" />
            </svg>
          </div>

          <p className="body-copy mx-auto mt-4 max-w-md text-sm sm:text-base text-slate-500">
            One stroke. Thirty seconds. The same board.
          </p>

          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <button
              className="action-button action-primary px-8 py-3 rounded-full"
              onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
            >
              Start
            </button>
            <button
              className="action-button action-secondary px-8 py-3 rounded-full border"
              onClick={() => setShowHowToPlay(true)}
            >
              How to Play
            </button>
          </div>
        </section>
      </div>

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-slate-400 opacity-50 z-10 pointer-events-none">
        {context.username ?? 'Guest'} session
      </div>

      {showHowToPlay && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(248, 250, 252, 0.85)', backdropFilter: 'blur(12px)' }}
        >
          <div className="surface-panel-strong motion-rise w-full max-w-md rounded-[28px] p-6 text-left sm:p-8">
            <div className="title-divider mb-4">
              <span className="seal-mark text-[12px]">?</span>
              <h2 className="label-kicker">How to Play</h2>
            </div>

            <div className="body-copy space-y-4 text-sm sm:text-base">
              <p>
                <strong>Goal:</strong> Collect all blue targets by drawing a single continuous line.
              </p>
              <p>
                <strong>Rules:</strong>
              </p>
              <ul className="list-inside list-disc space-y-2">
                <li>You have exactly 30 seconds.</li>
                <li>Avoid hitting the red hazards.</li>
                <li>Once you lift your finger/mouse, your line becomes a snake that moves on its own!</li>
                <li>Solve as many puzzles as you can to get a high score.</li>
              </ul>
              <p className="mt-4 font-semibold accent-warm">Good luck and move fast!</p>
            </div>

            <div className="mt-8 flex justify-end">
              <button
                className="action-button action-primary w-full sm:w-auto"
                onClick={() => setShowHowToPlay(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
