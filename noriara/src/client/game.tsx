import './index.css';

import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { useCounter } from './hooks/useCounter';
import { createGame, GameCallbacks } from './DailyLineGame';
import type Phaser from 'phaser';
import type { BootstrapResponse } from '../shared/api';

type GameState = 'bootstrap' | 'ready' | 'playing' | 'results' | 'error';

type RunResult = {
  score: number;
  puzzlesSolved: number;
  maxCombo: number;
};

const LOCAL_BEST_KEY = 'daily-line-local-best';

export const App = () => {
  const { username } = useCounter();
  const [seed, setSeed] = useState('');
  const [dailyDate, setDailyDate] = useState('');
  const [gameState, setGameState] = useState<GameState>('bootstrap');
  const [sessionId, setSessionId] = useState(0);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeMs, setTimeMs] = useState(30000);
  const [finalResult, setFinalResult] = useState<RunResult | null>(null);
  const [bestLocalScore, setBestLocalScore] = useState<number | null>(null);

  const gameRef = useRef<HTMLDivElement>(null);
  const phaserSceneRef = useRef<(Phaser.Scene & { startCountdown: () => void }) | null>(null);

  const localBestStorageKey = useMemo(
    () => (dailyDate ? `${LOCAL_BEST_KEY}:${dailyDate}` : LOCAL_BEST_KEY),
    [dailyDate]
  );

  const loadLocalBest = useCallback((storageKey: string) => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) {
        setBestLocalScore(null);
        return;
      }
      const parsed = Number.parseInt(raw, 10);
      setBestLocalScore(Number.isFinite(parsed) ? parsed : null);
    } catch (error) {
      console.error('Failed to load local best score', error);
      setBestLocalScore(null);
    }
  }, []);

  const saveLocalBest = useCallback((storageKey: string, value: number) => {
    try {
      window.localStorage.setItem(storageKey, value.toString());
    } catch (error) {
      console.error('Failed to save local best score', error);
    }
  }, []);

  const fetchBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: BootstrapResponse = await res.json();
      setSeed(data.seed);
      setDailyDate(data.date);
      setGameState('ready');
      loadLocalBest(`${LOCAL_BEST_KEY}:${data.date}`);
    } catch (err) {
      console.error('Failed to bootstrap game', err);
      setGameState('error');
    }
  }, [loadLocalBest]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchBootstrap();
  }, [fetchBootstrap]);

  useEffect(() => {
    if (!gameRef.current || !seed) return;

    const callbacks: GameCallbacks = {
      onScoreChange: (nextScore, nextCombo) => {
        setScore(nextScore);
        setCombo(nextCombo);
      },
      onTimeChange: (nextTime) => setTimeMs(nextTime),
      onFinish: (result) => {
        setFinalResult(result);
        setGameState('results');
        setBestLocalScore((currentBest) => {
          const nextBest = currentBest === null ? result.score : Math.max(currentBest, result.score);
          saveLocalBest(localBestStorageKey, nextBest);
          return nextBest;
        });
      },
      onReady: (scene) => {
        phaserSceneRef.current = scene;
      },
    };

    const game = createGame(gameRef.current, seed, callbacks);

    return () => {
      game.destroy(true);
      phaserSceneRef.current = null;
    };
  }, [seed, sessionId, localBestStorageKey, saveLocalBest]);

  const handleStart = () => {
    if (!phaserSceneRef.current) return;

    setGameState('playing');
    setScore(0);
    setCombo(0);
    setTimeMs(30000);
    setFinalResult(null);
    phaserSceneRef.current.startCountdown();
  };

  const handlePlayAgain = () => {
    setSessionId((current) => current + 1);
    setScore(0);
    setCombo(0);
    setTimeMs(30000);
    setFinalResult(null);
    setGameState('ready');
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `00:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#1e293b,_#0f172a_60%)] text-slate-100">
      <div className="mx-auto flex min-h-screen w-full max-w-5xl flex-col px-4 pb-6 pt-4">
        <header className="mb-4 flex items-start justify-between rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 backdrop-blur">
          <div className="flex flex-col">
            <span className="text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/80">
              Daily Line
            </span>
            <span className="text-sm text-slate-300">
              {dailyDate || 'Loading daily board'}
            </span>
          </div>

          <div className="text-right text-sm text-slate-400">
            <div>{username ?? 'anonymous'}</div>
            {bestLocalScore !== null && (
              <div className="text-xs uppercase tracking-[0.25em] text-amber-300/80">
                Local Best {bestLocalScore}
              </div>
            )}
          </div>
        </header>

        <main className="relative mx-auto flex w-full max-w-3xl flex-1 flex-col">
          {gameState === 'playing' && (
            <div className="mb-4 grid grid-cols-3 gap-3">
              <HudStat label="Time" value={formatTime(timeMs)} accent="text-cyan-200" />
              <HudStat label="Score" value={score.toString()} accent="text-emerald-300" />
              <HudStat label="Combo" value={`x${combo}`} accent={combo > 1 ? 'text-amber-300' : 'text-slate-300'} />
            </div>
          )}

          {gameState === 'bootstrap' && (
            <div className="flex aspect-[3/2] items-center justify-center rounded-[24px] border border-white/10 bg-slate-950/40 shadow-2xl">
              <div className="text-sm font-semibold uppercase tracking-[0.35em] text-slate-400">
                Loading daily seed...
              </div>
            </div>
          )}

          {gameState === 'error' && (
            <div className="flex aspect-[3/2] flex-col items-center justify-center rounded-[24px] border border-rose-400/30 bg-slate-950/40 px-6 text-center shadow-2xl">
              <h2 className="mb-3 text-2xl font-semibold text-rose-200">Bootstrap failed</h2>
              <p className="mb-6 max-w-md text-sm text-slate-300">
                The local game could not load today&apos;s seed from the server.
              </p>
              <button
                onClick={() => void fetchBootstrap()}
                className="rounded-full bg-cyan-400 px-6 py-3 text-sm font-semibold uppercase tracking-[0.3em] text-slate-950 transition hover:bg-cyan-300"
              >
                Retry
              </button>
            </div>
          )}

          <div
            ref={gameRef}
            className={`w-full aspect-[3/2] overflow-hidden rounded-[24px] border border-cyan-200/10 bg-[#0f172a] shadow-[0_30px_80px_rgba(15,23,42,0.45)] ${
              gameState === 'bootstrap' || gameState === 'error' ? 'hidden' : 'block'
            }`}
          />

          {gameState === 'ready' && (
            <OverlayCard>
              <p className="mb-2 text-xs uppercase tracking-[0.35em] text-cyan-300/80">Today&apos;s challenge</p>
              <h1 className="mb-3 text-4xl font-semibold text-white">Draw. Release. Watch it move.</h1>
              <p className="mb-8 max-w-md text-center text-sm text-slate-300">
                Shape one living line to collect every target and avoid the black holes before time runs out.
              </p>
              <button
                onClick={handleStart}
                className="rounded-full bg-amber-300 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-950 transition hover:bg-amber-200"
              >
                Start Run
              </button>
            </OverlayCard>
          )}

          {gameState === 'results' && finalResult && (
            <OverlayCard>
              <p className="mb-2 text-xs uppercase tracking-[0.35em] text-amber-300/80">Run complete</p>
              <h2 className="mb-8 text-4xl font-semibold text-white">Time&apos;s up</h2>

              <div className="mb-8 grid w-full max-w-lg grid-cols-2 gap-4">
                <ResultStat label="Final Score" value={finalResult.score.toString()} accent="text-amber-300" />
                <ResultStat label="Puzzles" value={finalResult.puzzlesSolved.toString()} accent="text-cyan-200" />
                <ResultStat label="Max Combo" value={`x${finalResult.maxCombo}`} accent="text-emerald-300" />
                <ResultStat
                  label="Local Best"
                  value={(bestLocalScore ?? finalResult.score).toString()}
                  accent="text-fuchsia-200"
                />
              </div>

              <button
                onClick={handlePlayAgain}
                className="rounded-full bg-cyan-400 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-950 transition hover:bg-cyan-300"
              >
                Practice Again
              </button>
            </OverlayCard>
          )}
        </main>
      </div>
    </div>
  );
};

type HudStatProps = {
  label: string;
  value: string;
  accent: string;
};

const HudStat = ({ label, value, accent }: HudStatProps) => (
  <div className="rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-3 backdrop-blur">
    <div className="text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{label}</div>
    <div className={`mt-1 font-mono text-2xl font-semibold ${accent}`}>{value}</div>
  </div>
);

type ResultStatProps = {
  label: string;
  value: string;
  accent: string;
};

const ResultStat = ({ label, value, accent }: ResultStatProps) => (
  <div className="rounded-2xl border border-white/10 bg-slate-950/45 p-4 text-center">
    <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">{label}</div>
    <div className={`font-mono text-3xl font-semibold ${accent}`}>{value}</div>
  </div>
);

const OverlayCard = ({ children }: { children: ReactNode }) => (
  <div className="absolute inset-0 flex flex-col items-center justify-center rounded-[24px] bg-slate-950/72 px-6 text-center backdrop-blur-md">
    {children}
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
