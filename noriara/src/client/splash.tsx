import './index.css';

import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';

/* Animated background canvas */



interface SnakeSegment {
  x: number;
  y: number;
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
const TargetLayer = () => {
  const targets = useRef(
    Array.from({ length: 6 }).map((_, i) => {
      const colors = ['rgba(43, 89, 195, 0.5)', 'rgba(46, 139, 87, 0.5)', 'rgba(200, 62, 77, 0.5)'];
      return {
        id: i,
        x: 10 + Math.random() * 80,
        y: 10 + Math.random() * 80,
        size: 30 + Math.random() * 30, // 30-60px
        color: colors[i % colors.length],
        delay: Math.random() * 4,
        animDuration: 10 + Math.random() * 10, // 10-20s float
      };
    })
  ).current;

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
              className="action-button action-secondary px-8 py-3 rounded-full"
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
