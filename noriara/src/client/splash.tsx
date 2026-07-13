import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

/* Animated background canvas */

interface FloatingTarget {
  x: number;
  y: number;
  r: number;
  vx: number;
  vy: number;
  phase: number;
}

interface SnakeSegment {
  x: number;
  y: number;
}

function createFloatingTargets(w: number, h: number): FloatingTarget[] {
  const targets: FloatingTarget[] = [];
  for (let i = 0; i < 6; i++) {
    targets.push({
      x: Math.random() * w,
      y: Math.random() * h,
      r: 6 + Math.random() * 8,
      vx: (Math.random() - 0.5) * 0.3,
      vy: (Math.random() - 0.5) * 0.3,
      phase: Math.random() * Math.PI * 2,
    });
  }
  return targets;
}

function createSnake(w: number, h: number): SnakeSegment[] {
  const segments: SnakeSegment[] = [];
  const cx = w / 2;
  const cy = h / 2;
  for (let i = 0; i < 120; i++) {
    const t = i * 0.05;
    segments.push({
      x: cx + Math.cos(t * 0.7) * (w * 0.28) + Math.sin(t * 1.3) * 40,
      y: cy + Math.sin(t * 0.9) * (h * 0.22) + Math.cos(t * 1.1) * 30,
    });
  }
  return segments;
}

function useBackgroundCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    snake: SnakeSegment[];
    targets: FloatingTarget[];
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
        targets: createFloatingTargets(rect.width, rect.height),
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

      // Draw floating targets
      for (const t of s.targets) {
        t.x += t.vx;
        t.y += t.vy;
        if (t.x < -20) t.x = w + 20;
        if (t.x > w + 20) t.x = -20;
        if (t.y < -20) t.y = h + 20;
        if (t.y > h + 20) t.y = -20;

        const pulse = 1 + Math.sin(s.frame * 0.03 + t.phase) * 0.15;
        const r = t.r * pulse;

        ctx.beginPath();
        ctx.arc(t.x, t.y, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(208, 157, 134, 0.25)';
        ctx.fill();

        ctx.beginPath();
        ctx.arc(t.x, t.y, r, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(160, 79, 55, 0.15)';
        ctx.fill();
      }

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
          ctx.strokeStyle = `rgba(41, 35, 29, ${progress * 0.12})`;
          ctx.lineWidth = 3 + progress * 2;
          ctx.stroke();
        }

        // Snake head dot
        const headIdx = (visibleStart + segCount - 1) % snakeLen;
        const head = s.snake[headIdx]!;
        ctx.beginPath();
        ctx.arc(head.x, head.y, 5, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(41, 35, 29, 0.18)';
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

      <div className="motion-rise relative z-10 mx-auto w-full max-w-xl">
        <section className="surface-panel-strong rounded-[30px] px-6 py-8 text-center sm:px-8 sm:py-10">
          <div className="mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border soft-divider bg-white/40 p-3 shadow-[0_4px_16px_rgba(160,79,55,0.1)] sm:h-20 sm:w-20">
            <img className="object-contain" src="/snoo.png" alt="Snoo" />
          </div>

          <p className="label-kicker mt-6">Daily Line</p>
          <h1 className="display-title brush-stroke mt-4 text-4xl sm:text-5xl">Noriara</h1>
          <p className="body-copy mx-auto mt-4 max-w-md text-sm sm:text-base">
            One stroke. Thirty seconds. The same board.
          </p>

          <div className="mt-7 flex flex-wrap justify-center gap-3">
            <button
              className="action-button action-primary"
              onClick={(e) => requestExpandedMode(e.nativeEvent, 'game')}
            >
              Start
            </button>
            <button
              className="action-button action-secondary"
              onClick={() => setShowHowToPlay(true)}
            >
              How to Play
            </button>
          </div>

          <div className="mt-6 text-xs ink-muted">{context.username ?? 'Guest'} session</div>
        </section>
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
