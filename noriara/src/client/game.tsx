import './index.css';

import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createGame, GameCallbacks } from './DailyLineGame';
import type Phaser from 'phaser';
import type {
  BootstrapResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  RunMode,
  RunTelemetry,
  StartRunResponse,
  SubmitRunResponse,
} from '../shared/api';

type GameState = 'bootstrap' | 'ready' | 'playing' | 'results' | 'error';

type RunResult = {
  score: number;
  puzzlesSolved: number;
  maxCombo: number;
};

type SubmissionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'accepted'; rank: number | null }
  | { status: 'rejected'; reason: string };

const LOCAL_BEST_KEY = 'daily-line-local-best';

export const App = () => {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [gameState, setGameState] = useState<GameState>('bootstrap');
  const [sessionId, setSessionId] = useState(0);
  const [runMode, setRunMode] = useState<RunMode>('practice');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeMs, setTimeMs] = useState(30000);
  const [finalResult, setFinalResult] = useState<RunResult | null>(null);
  const [bestLocalScore, setBestLocalScore] = useState<number | null>(null);
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ status: 'idle' });

  const gameRef = useRef<HTMLDivElement>(null);
  const phaserSceneRef = useRef<(Phaser.Scene & { startCountdown: () => void }) | null>(null);
  const pendingCountdownRef = useRef(false);
  const runModeRef = useRef<RunMode>('practice');
  const officialRunIdRef = useRef<string | null>(null);
  const bootstrapRef = useRef<BootstrapResponse | null>(null);

  const dailyDate = bootstrap?.date ?? '';
  const seed = bootstrap?.seed ?? '';
  const username = bootstrap?.username ?? null;
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
      setBootstrap(data);
      setLeaderboardEntries(data.leaderboardPreview);
      setGameState('ready');
      loadLocalBest(`${LOCAL_BEST_KEY}:${data.date}`);
    } catch (error) {
      console.error('Failed to bootstrap game', error);
      setGameState('error');
    }
  }, [loadLocalBest]);

  const fetchLeaderboard = useCallback(async () => {
    try {
      const res = await fetch('/api/leaderboard');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LeaderboardResponse = await res.json();
      setLeaderboardEntries(data.entries);
      setShowLeaderboard(true);
    } catch (error) {
      console.error('Failed to load leaderboard', error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchBootstrap();
  }, [fetchBootstrap]);

  useEffect(() => {
    bootstrapRef.current = bootstrap;
  }, [bootstrap]);

  const startLocalRun = useCallback((mode: RunMode, runId: string | null) => {
    runModeRef.current = mode;
    officialRunIdRef.current = runId;

    setRunMode(mode);
    setScore(0);
    setCombo(0);
    setTimeMs(30000);
    setFinalResult(null);
    setSubmissionState({ status: 'idle' });
    setShowLeaderboard(false);
    setGameState('playing');
    pendingCountdownRef.current = true;
    phaserSceneRef.current?.startCountdown();
    if (phaserSceneRef.current) {
      pendingCountdownRef.current = false;
    }
  }, []);

  const handleOfficialStart = useCallback(async () => {
    try {
      const res = await fetch('/api/run/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: StartRunResponse = await res.json();
      startLocalRun(data.mode, data.runId);
    } catch (error) {
      console.error('Failed to start run', error);
      startLocalRun('practice', null);
    }
  }, [startLocalRun]);

  const handlePracticeStart = useCallback(() => {
    startLocalRun('practice', null);
  }, [startLocalRun]);

  const submitOfficialRun = useCallback(
    async (
      runId: string,
      runDate: string,
      runSeed: string,
      result: RunResult,
      telemetry: RunTelemetry
    ) => {
      const currentBootstrap = bootstrapRef.current;
      if (!currentBootstrap) return;

      try {
        const res = await fetch('/api/run/submit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId,
            date: runDate,
            seed: runSeed,
            telemetry,
          }),
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: SubmitRunResponse = await res.json();
        setLeaderboardEntries(data.leaderboardPreview);

        if (data.accepted) {
          setSubmissionState({ status: 'accepted', rank: data.rank });
          setFinalResult({
            score: data.finalScore,
            puzzlesSolved: data.puzzlesSolved,
            maxCombo: result.maxCombo,
          });
          await fetchBootstrap();
        } else {
          setSubmissionState({
            status: 'rejected',
            reason: data.reason ?? 'Official submission was rejected.',
          });
        }
      } catch (error) {
        console.error('Failed to submit official run', error);
        setSubmissionState({
          status: 'rejected',
          reason: 'Submission failed before the server returned a result.',
        });
      } finally {
        officialRunIdRef.current = null;
      }
    },
    [fetchBootstrap]
  );

  useEffect(() => {
    if (!gameRef.current || !seed) return;

    const callbacks: GameCallbacks = {
      onScoreChange: (nextScore, nextCombo) => {
        setScore(nextScore);
        setCombo(nextCombo);
      },
      onTimeChange: (nextTime) => setTimeMs(nextTime),
      onFinish: (result, telemetry) => {
        setFinalResult(result);
        setGameState('results');
        setBestLocalScore((currentBest) => {
          const nextBest = currentBest === null ? result.score : Math.max(currentBest, result.score);
          saveLocalBest(localBestStorageKey, nextBest);
          return nextBest;
        });

        const activeRunMode = runModeRef.current;
        const activeRunId = officialRunIdRef.current;
        const activeBootstrap = bootstrapRef.current;

        if (activeRunMode === 'official' && activeRunId && activeBootstrap) {
          setSubmissionState({ status: 'submitting' });
          void submitOfficialRun(
            activeRunId,
            activeBootstrap.date,
            activeBootstrap.seed,
            result,
            telemetry
          );
        } else {
          setSubmissionState({ status: 'idle' });
        }
      },
      onReady: (scene) => {
        phaserSceneRef.current = scene;
        if (pendingCountdownRef.current) {
          pendingCountdownRef.current = false;
          scene.startCountdown();
        }
      },
    };

    const game = createGame(gameRef.current, seed, callbacks);

    return () => {
      game.destroy(true);
      phaserSceneRef.current = null;
    };
  }, [localBestStorageKey, saveLocalBest, seed, sessionId, submitOfficialRun]);

  const handlePlayAgain = () => {
    setSessionId((current) => current + 1);
    setScore(0);
    setCombo(0);
    setTimeMs(30000);
    setFinalResult(null);
    runModeRef.current = 'practice';
    officialRunIdRef.current = null;
    pendingCountdownRef.current = false;
    setRunMode('practice');
    setSubmissionState({ status: 'idle' });
    setGameState('ready');
  };

  const formatTime = (ms: number) => {
    const seconds = Math.ceil(ms / 1000);
    return `00:${seconds.toString().padStart(2, '0')}`;
  };

  const officialSubmitted = bootstrap?.hasSubmittedToday ?? false;
  const canStartOfficial = bootstrap?.canStartOfficial ?? false;

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
            <div>{username ?? 'practice mode'}</div>
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
                The game could not load today&apos;s daily state from the server.
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

          {gameState === 'ready' && bootstrap && (
            <OverlayCard>
              <p className="mb-2 text-xs uppercase tracking-[0.35em] text-cyan-300/80">Today&apos;s challenge</p>
              <h1 className="mb-3 text-4xl font-semibold text-white">Draw. Release. Compete.</h1>
              <p className="mb-4 max-w-md text-center text-sm text-slate-300">
                Shape one living line to collect every target and avoid the black holes before time runs out.
              </p>

              {!bootstrap.loggedIn && (
                <p className="mb-4 text-sm text-amber-200">
                  Practice is available. Official daily ranking requires a logged-in Reddit account.
                </p>
              )}

              {officialSubmitted && bootstrap.currentRun && (
                <p className="mb-4 text-sm text-emerald-200">
                  Official run submitted: {bootstrap.currentRun.score} points, rank {bootstrap.currentRun.rank}.
                </p>
              )}

              <div className="mb-8 flex flex-wrap items-center justify-center gap-3">
                {canStartOfficial && (
                  <button
                    onClick={() => void handleOfficialStart()}
                    className="rounded-full bg-amber-300 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-950 transition hover:bg-amber-200"
                  >
                    Official Run
                  </button>
                )}
                <button
                  onClick={handlePracticeStart}
                  className="rounded-full border border-cyan-300/40 bg-cyan-400/10 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  {canStartOfficial ? 'Practice' : 'Practice Run'}
                </button>
                <button
                  onClick={() => void fetchLeaderboard()}
                  className="rounded-full border border-white/15 bg-white/5 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-200 transition hover:bg-white/10"
                >
                  Leaderboard
                </button>
              </div>

              <LeaderboardPreview entries={leaderboardEntries} />
            </OverlayCard>
          )}

          {gameState === 'results' && finalResult && (
            <OverlayCard>
              <p className="mb-2 text-xs uppercase tracking-[0.35em] text-amber-300/80">
                {runMode === 'official' ? 'Official run complete' : 'Practice run complete'}
              </p>
              <h2 className="mb-8 text-4xl font-semibold text-white">Time&apos;s up</h2>

              <div className="mb-6 grid w-full max-w-lg grid-cols-2 gap-4">
                <ResultStat label="Final Score" value={finalResult.score.toString()} accent="text-amber-300" />
                <ResultStat label="Puzzles" value={finalResult.puzzlesSolved.toString()} accent="text-cyan-200" />
                <ResultStat label="Max Combo" value={`x${finalResult.maxCombo}`} accent="text-emerald-300" />
                <ResultStat
                  label="Local Best"
                  value={(bestLocalScore ?? finalResult.score).toString()}
                  accent="text-fuchsia-200"
                />
              </div>

              <SubmissionBanner submissionState={submissionState} />

              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handlePlayAgain}
                  className="rounded-full bg-cyan-400 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-950 transition hover:bg-cyan-300"
                >
                  Practice Again
                </button>
                <button
                  onClick={() => void fetchLeaderboard()}
                  className="rounded-full border border-white/15 bg-white/5 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-slate-200 transition hover:bg-white/10"
                >
                  Leaderboard
                </button>
              </div>
            </OverlayCard>
          )}

          {showLeaderboard && (
            <OverlayCard>
              <div className="mb-3 flex w-full max-w-2xl items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Daily leaderboard</p>
                <button
                  onClick={() => setShowLeaderboard(false)}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <LeaderboardTable entries={leaderboardEntries} />
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

const SubmissionBanner = ({ submissionState }: { submissionState: SubmissionState }) => {
  if (submissionState.status === 'idle') return null;
  if (submissionState.status === 'submitting') {
    return <p className="text-sm text-cyan-200">Submitting official run to the server...</p>;
  }
  if (submissionState.status === 'accepted') {
    return (
      <p className="text-sm text-emerald-200">
        Official run accepted{submissionState.rank ? `, current rank ${submissionState.rank}.` : '.'}
      </p>
    );
  }
  return <p className="text-sm text-rose-200">Official submission rejected: {submissionState.reason}</p>;
};

const LeaderboardPreview = ({ entries }: { entries: LeaderboardEntry[] }) => {
  if (entries.length === 0) {
    return <p className="text-sm text-slate-400">No ranked runs submitted yet today.</p>;
  }

  return (
    <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-slate-950/45 p-4">
      <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500">
        Top today
      </div>
      <div className="space-y-2">
        {entries.map((entry) => (
          <div
            key={`${entry.rank}-${entry.username}`}
            className={`flex min-w-0 items-center gap-3 rounded-xl px-3 py-2 text-sm ${
              entry.isCurrentUser ? 'bg-cyan-400/10 text-cyan-100' : 'bg-white/5 text-slate-200'
            }`}
          >
            <span className="w-11 shrink-0 font-mono text-slate-400">#{entry.rank}</span>
            <span className="min-w-0 flex-1 truncate text-left">{entry.username}</span>
            <span className="shrink-0 text-right font-mono text-amber-200">{entry.score}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

const LeaderboardTable = ({ entries }: { entries: LeaderboardEntry[] }) => {
  if (entries.length === 0) {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/45 p-4">
        <div className="px-3 py-6 text-center text-sm text-slate-400">No submissions yet.</div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/45 p-3 sm:p-4">
      <div className="hidden grid-cols-[56px_minmax(0,1fr)_120px_90px] gap-3 px-3 text-[11px] font-semibold uppercase tracking-[0.3em] text-slate-500 md:grid">
        <span>Rank</span>
        <span>Player</span>
        <span className="text-right">Score</span>
        <span className="text-right">Puzzles</span>
      </div>

      <div className="space-y-2 md:mt-3">
        {entries.map((entry) => (
          <article
            key={`${entry.rank}-${entry.username}`}
            className={`rounded-2xl border px-3 py-3 text-sm ${
              entry.isCurrentUser
                ? 'border-cyan-300/30 bg-cyan-400/10 text-cyan-100'
                : 'border-white/8 bg-white/5 text-slate-200'
            }`}
          >
            <div className="flex items-start justify-between gap-3 md:hidden">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-500">Player</div>
                <div className="mt-1 truncate text-base font-semibold">{entry.username}</div>
              </div>
              <div className="shrink-0 rounded-full border border-white/10 px-3 py-1 font-mono text-xs text-slate-300">
                #{entry.rank}
              </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3 md:hidden">
              <MobileLeaderboardStat label="Score" value={entry.score.toString()} accent="text-amber-200" />
              <MobileLeaderboardStat
                label="Puzzles"
                value={entry.puzzlesSolved.toString()}
                accent="text-cyan-200"
              />
            </div>

            <div className="hidden min-w-0 grid-cols-[56px_minmax(0,1fr)_120px_90px] items-center gap-3 md:grid">
              <span className="font-mono text-slate-400">#{entry.rank}</span>
              <span className="truncate">{entry.username}</span>
              <span className="text-right font-mono text-amber-200">{entry.score}</span>
              <span className="text-right font-mono">{entry.puzzlesSolved}</span>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
};

const MobileLeaderboardStat = ({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) => (
  <div className="rounded-xl border border-white/10 bg-slate-950/35 p-3 text-left">
    <div className="text-[10px] font-semibold uppercase tracking-[0.24em] text-slate-500">{label}</div>
    <div className={`mt-1 font-mono text-lg font-semibold ${accent}`}>{value}</div>
  </div>
);

const OverlayCard = ({ children }: { children: ReactNode }) => (
  <div className="absolute inset-0 overflow-y-auto overflow-x-hidden rounded-[24px] bg-slate-950/72 px-4 py-5 text-center backdrop-blur-md sm:px-6 sm:py-6">
    <div className="flex min-h-full flex-col items-center justify-start sm:justify-center">
      {children}
    </div>
  </div>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
