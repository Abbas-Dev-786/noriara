import './index.css';

import { StrictMode, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { createGame, DEFAULT_GAME_SETTINGS, GameCallbacks, type GameSettings } from './DailyLineGame';
import type Phaser from 'phaser';
import type {
  BootstrapResponse,
  LeaderboardEntry,
  LeaderboardResponse,
  PersonalBestSummary,
  PlayerStats,
  RunMode,
  RunTelemetry,
  StartRunResponse,
  StatsResponse,
  SubmitRunResponse,
} from '../shared/api';
import { buildReplayTimeline, type ReplayData, type ReplayResponse } from '../shared/replay';
import type { Point } from '../shared/geom';

type GameState = 'bootstrap' | 'ready' | 'playing' | 'results' | 'error';

type RunResult = {
  score: number;
  puzzlesSolved: number;
  maxCombo: number;
};

type SubmissionState =
  | { status: 'idle' }
  | { status: 'submitting' }
  | { status: 'accepted'; rank: number | null; personalBest: PersonalBestSummary | null; replayAvailable: boolean }
  | { status: 'rejected'; reason: string };

const LOCAL_BEST_KEY = 'daily-line-local-best';
const GAME_SETTINGS_KEY = 'daily-line-settings';

export const App = () => {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [gameState, setGameState] = useState<GameState>('bootstrap');
  const [sessionId, setSessionId] = useState(0);
  const [runMode, setRunMode] = useState<RunMode>('practice');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showReplay, setShowReplay] = useState(false);
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [settings, setSettings] = useState<GameSettings>(DEFAULT_GAME_SETTINGS);
  const [activeReplay, setActiveReplay] = useState<ReplayData | null>(null);
  const [replayError, setReplayError] = useState<string | null>(null);
  const [replayLoading, setReplayLoading] = useState(false);

  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeMs, setTimeMs] = useState(30000);
  const [finalResult, setFinalResult] = useState<RunResult | null>(null);
  const [bestLocalScore, setBestLocalScore] = useState<number | null>(null);
  const [submissionState, setSubmissionState] = useState<SubmissionState>({ status: 'idle' });

  const gameRef = useRef<HTMLDivElement>(null);
  const phaserSceneRef = useRef<(Phaser.Scene & {
    startCountdown: () => void;
    updateSettings: (settings: GameSettings) => void;
  }) | null>(null);
  const pendingCountdownRef = useRef(false);
  const runModeRef = useRef<RunMode>('practice');
  const officialRunIdRef = useRef<string | null>(null);
  const bootstrapRef = useRef<BootstrapResponse | null>(null);
  const settingsRef = useRef<GameSettings>(DEFAULT_GAME_SETTINGS);

  const dailyDate = bootstrap?.date ?? '';
  const seed = bootstrap?.seed ?? '';
  const username = bootstrap?.username ?? null;
  const localBestStorageKey = useMemo(
    () => (dailyDate ? `${LOCAL_BEST_KEY}:${dailyDate}` : LOCAL_BEST_KEY),
    [dailyDate]
  );

  const loadSettings = useCallback(() => {
    try {
      const raw = window.localStorage.getItem(GAME_SETTINGS_KEY);
      if (!raw) return DEFAULT_GAME_SETTINGS;
      const parsed = JSON.parse(raw) as Partial<GameSettings>;
      return {
        soundEnabled: parsed.soundEnabled ?? DEFAULT_GAME_SETTINGS.soundEnabled,
        hapticsEnabled: parsed.hapticsEnabled ?? DEFAULT_GAME_SETTINGS.hapticsEnabled,
        reducedMotion: parsed.reducedMotion ?? DEFAULT_GAME_SETTINGS.reducedMotion,
        highContrast: parsed.highContrast ?? DEFAULT_GAME_SETTINGS.highContrast,
      };
    } catch (error) {
      console.error('Failed to load game settings', error);
      return DEFAULT_GAME_SETTINGS;
    }
  }, []);

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
      setPlayerStats(data.playerStats);
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

  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch('/api/stats');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: StatsResponse = await res.json();
      setPlayerStats(data.playerStats);
      setShowStats(true);
    } catch (error) {
      console.error('Failed to load stats', error);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(loadSettings());
    void fetchBootstrap();
  }, [fetchBootstrap, loadSettings]);

  useEffect(() => {
    bootstrapRef.current = bootstrap;
  }, [bootstrap]);

  useEffect(() => {
    settingsRef.current = settings;
    try {
      window.localStorage.setItem(GAME_SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Failed to save game settings', error);
    }
    phaserSceneRef.current?.updateSettings(settings);
  }, [settings]);

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
    setShowStats(false);
    setShowSettings(false);
    setShowReplay(false);
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
        setPlayerStats(data.playerStats);

        if (data.accepted) {
          setSubmissionState({
            status: 'accepted',
            rank: data.rank,
            personalBest: data.personalBest,
            replayAvailable: data.replayAvailable,
          });
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

    const game = createGame(gameRef.current, seed, callbacks, settingsRef.current);

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
    setShowStats(false);
    setShowReplay(false);
    setGameState('ready');
  };

  const openReplay = useCallback(
    async (replayUsername: string) => {
      if (!dailyDate) return;
      setReplayLoading(true);
      setReplayError(null);
      try {
        const res = await fetch(`/api/replay/${encodeURIComponent(replayUsername)}?date=${encodeURIComponent(dailyDate)}`);
        if (!res.ok) {
          if (res.status === 404) {
             throw new Error('Replay not found or has expired.');
          }
          throw new Error(`Failed to load replay (${res.status}).`);
        }
        const data: ReplayResponse = await res.json();
        setActiveReplay(data.replay);
        setShowReplay(true);
      } catch (error) {
        console.error('Failed to load replay', error);
        setReplayError(error instanceof Error ? error.message : 'Unknown error');
        setActiveReplay(null);
        setShowReplay(true);
      } finally {
        setReplayLoading(false);
      }
    },
    [dailyDate]
  );

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
            {playerStats && (
              <div className="text-xs uppercase tracking-[0.25em] text-cyan-300/80">
                Streak {playerStats.currentStreak}
              </div>
            )}
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
                <div className="mb-4 flex flex-col items-center gap-2">
                  <p className="text-sm text-emerald-200">
                    Official run submitted: {bootstrap.currentRun.score} points, rank {bootstrap.currentRun.rank}.
                  </p>
                  {bootstrap.currentRun.hasReplay && username && (
                    <button
                      onClick={() => void openReplay(username)}
                      className="rounded-full border border-amber-300/25 bg-amber-300/10 px-5 py-2 text-xs font-semibold uppercase tracking-[0.25em] text-amber-100 transition hover:bg-amber-300/20"
                    >
                      Watch Replay
                    </button>
                  )}
                </div>
              )}

              {playerStats && (
                <div className="mb-6 grid w-full max-w-xl grid-cols-2 gap-3 md:grid-cols-4">
                  <CompactStat label="Streak" value={playerStats.currentStreak.toString()} accent="text-cyan-200" />
                  <CompactStat label="Best Score" value={playerStats.bestScore.toString()} accent="text-amber-200" />
                  <CompactStat
                    label="Best Rank"
                    value={playerStats.bestRank ? `#${playerStats.bestRank}` : '-'}
                    accent="text-emerald-200"
                  />
                  <CompactStat
                    label="Total Runs"
                    value={playerStats.totalOfficialRuns.toString()}
                    accent="text-fuchsia-200"
                  />
                </div>
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
                <button
                  onClick={() => setShowSettings(true)}
                  className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  Settings
                </button>
                {bootstrap.loggedIn && (
                  <button
                    onClick={() => void fetchStats()}
                    className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-emerald-100 transition hover:bg-emerald-400/20"
                  >
                    Stats
                  </button>
                )}
              </div>

              <LeaderboardPreview entries={leaderboardEntries} onOpenReplay={openReplay} />
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
              <PersonalBestBanner submissionState={submissionState} />

              {playerStats && (
                <div className="mt-6 grid w-full max-w-lg grid-cols-2 gap-4">
                  <CompactStat label="Current Streak" value={playerStats.currentStreak.toString()} accent="text-cyan-200" />
                  <CompactStat label="Longest Streak" value={playerStats.longestStreak.toString()} accent="text-emerald-200" />
                  <CompactStat
                    label="Best Rank"
                    value={playerStats.bestRank ? `#${playerStats.bestRank}` : '-'}
                    accent="text-amber-200"
                  />
                  <CompactStat
                    label="Total Solved"
                    value={playerStats.totalPuzzlesSolved.toString()}
                    accent="text-fuchsia-200"
                  />
                </div>
              )}

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
                {submissionState.status === 'accepted' && submissionState.rank !== null && submissionState.replayAvailable && (
                  <button
                    onClick={() => username && void openReplay(username)}
                    className="rounded-full border border-amber-300/25 bg-amber-300/10 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-amber-100 transition hover:bg-amber-300/20"
                  >
                    Watch Replay
                  </button>
                )}
                <button
                  onClick={() => setShowSettings(true)}
                  className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-cyan-100 transition hover:bg-cyan-400/20"
                >
                  Settings
                </button>
                {bootstrap?.loggedIn && (
                  <button
                    onClick={() => void fetchStats()}
                    className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-8 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-emerald-100 transition hover:bg-emerald-400/20"
                  >
                    Stats
                  </button>
                )}
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
              <LeaderboardTable entries={leaderboardEntries} onOpenReplay={openReplay} />
            </OverlayCard>
          )}

          {showStats && (
            <OverlayCard>
              <div className="mb-3 flex w-full max-w-2xl items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.35em] text-emerald-300/80">Player stats</p>
                <button
                  onClick={() => setShowStats(false)}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <StatsPanel playerStats={playerStats} />
            </OverlayCard>
          )}

          {showSettings && (
            <OverlayCard>
              <div className="mb-3 flex w-full max-w-2xl items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.35em] text-cyan-300/80">Accessibility and feedback</p>
                <button
                  onClick={() => setShowSettings(false)}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              <SettingsPanel settings={settings} setSettings={setSettings} />
            </OverlayCard>
          )}

          {showReplay && (
            <OverlayCard>
              <div className="mb-3 flex w-full max-w-3xl items-center justify-between gap-3">
                <p className="text-xs uppercase tracking-[0.35em] text-amber-300/80">Replay viewer</p>
                <button
                  onClick={() => setShowReplay(false)}
                  className="rounded-full border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-slate-200 transition hover:bg-white/10"
                >
                  Close
                </button>
              </div>
              {replayLoading ? (
                <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-950/45 p-6 text-sm text-slate-300">
                  Loading replay...
                </div>
              ) : (
                <ReplayPanel replay={activeReplay} error={replayError} />
              )}
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

const CompactStat = ({ label, value, accent }: ResultStatProps) => (
  <div className="rounded-2xl border border-white/10 bg-slate-950/35 p-4 text-center">
    <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-slate-500">{label}</div>
    <div className={`font-mono text-xl font-semibold ${accent}`}>{value}</div>
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
        {!submissionState.replayAvailable ? ' Replay storage unavailable for this run.' : ''}
      </p>
    );
  }
  return <p className="text-sm text-rose-200">Official submission rejected: {submissionState.reason}</p>;
};

const PersonalBestBanner = ({ submissionState }: { submissionState: SubmissionState }) => {
  if (submissionState.status !== 'accepted' || !submissionState.personalBest) return null;

  const { personalBest } = submissionState;
  const messages: string[] = [];

  if (personalBest.isNewBestScore) {
    messages.push(
      personalBest.previousBestScore === null
        ? 'First official best score recorded.'
        : `New best score by ${personalBest.scoreDelta}.`
    );
  } else if (personalBest.scoreDelta !== null) {
    messages.push(`Score delta ${personalBest.scoreDelta}.`);
  }

  if (personalBest.isNewBestPuzzlesSolved) {
    messages.push(
      personalBest.previousBestPuzzlesSolved === null
        ? 'First official puzzle milestone recorded.'
        : `New puzzle milestone by ${personalBest.puzzlesDelta}.`
    );
  } else if (personalBest.puzzlesDelta !== null) {
    messages.push(`Puzzle delta ${personalBest.puzzlesDelta}.`);
  }

  if (messages.length === 0) return null;

  return <p className="mt-3 max-w-lg text-sm text-amber-200">{messages.join(' ')}</p>;
};

const LeaderboardPreview = ({
  entries,
  onOpenReplay,
}: {
  entries: LeaderboardEntry[];
  onOpenReplay: (username: string) => void;
}) => {
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
            {entry.hasReplay && (
              <button
                onClick={() => onOpenReplay(entry.username)}
                className="shrink-0 rounded-full border border-amber-300/20 bg-amber-300/10 px-2 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-amber-100 transition hover:bg-amber-300/20"
              >
                Replay
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

const LeaderboardTable = ({
  entries,
  onOpenReplay,
}: {
  entries: LeaderboardEntry[];
  onOpenReplay: (username: string) => void;
}) => {
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
            {entry.hasReplay && (
              <div className="mt-3 md:hidden">
                <button
                  onClick={() => onOpenReplay(entry.username)}
                  className="w-full rounded-full border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-center text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-100 transition hover:bg-amber-300/20"
                >
                  Watch Replay
                </button>
              </div>
            )}

            <div className="hidden min-w-0 grid-cols-[56px_minmax(0,1fr)_120px_90px] items-center gap-3 md:grid">
              <span className="font-mono text-slate-400">#{entry.rank}</span>
              <span className="truncate">{entry.username}</span>
              <span className="text-right font-mono text-amber-200">{entry.score}</span>
              <span className="text-right font-mono">{entry.puzzlesSolved}</span>
              {entry.hasReplay && (
                <button
                  onClick={() => onOpenReplay(entry.username)}
                  className="col-span-4 rounded-xl border border-amber-300/20 bg-amber-300/10 px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-amber-100 transition hover:bg-amber-300/20"
                >
                  Watch Replay
                </button>
              )}
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

const StatsPanel = ({ playerStats }: { playerStats: PlayerStats | null }) => {
  if (!playerStats) {
    return (
      <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/45 p-6 text-sm text-slate-400">
        No official stats yet. Submit an official run to start your streak.
      </div>
    );
  }

  return (
    <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/45 p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <CompactStat label="Current Streak" value={playerStats.currentStreak.toString()} accent="text-cyan-200" />
        <CompactStat label="Longest Streak" value={playerStats.longestStreak.toString()} accent="text-emerald-200" />
        <CompactStat label="Best Score" value={playerStats.bestScore.toString()} accent="text-amber-200" />
        <CompactStat
          label="Best Rank"
          value={playerStats.bestRank ? `#${playerStats.bestRank}` : '-'}
          accent="text-fuchsia-200"
        />
        <CompactStat
          label="Highest Puzzle"
          value={playerStats.highestPuzzleReached.toString()}
          accent="text-cyan-200"
        />
        <CompactStat
          label="Official Runs"
          value={playerStats.totalOfficialRuns.toString()}
          accent="text-emerald-200"
        />
      </div>
      <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-left text-sm text-slate-300">
        <div>Total puzzles solved: {playerStats.totalPuzzlesSolved}</div>
        <div className="mt-1">Last submission: {playerStats.lastSubmissionDate ?? 'none'}</div>
      </div>
    </div>
  );
};

const SettingsPanel = ({
  settings,
  setSettings,
}: {
  settings: GameSettings;
  setSettings: React.Dispatch<React.SetStateAction<GameSettings>>;
}) => (
  <div className="w-full max-w-2xl rounded-2xl border border-white/10 bg-slate-950/45 p-4 sm:p-6">
    <div className="space-y-3">
      <SettingToggle
        label="Sound"
        description="Countdown, success, failure, and time-up tones."
        checked={settings.soundEnabled}
        onToggle={() => setSettings((current) => ({ ...current, soundEnabled: !current.soundEnabled }))}
      />
      <SettingToggle
        label="Haptics"
        description="Short vibration feedback on countdown, success, and failure where supported."
        checked={settings.hapticsEnabled}
        onToggle={() => setSettings((current) => ({ ...current, hapticsEnabled: !current.hapticsEnabled }))}
      />
      <SettingToggle
        label="Reduced Motion"
        description="Softens flashes, disables shake, and tones down motion-heavy effects."
        checked={settings.reducedMotion}
        onToggle={() => setSettings((current) => ({ ...current, reducedMotion: !current.reducedMotion }))}
      />
      <SettingToggle
        label="High Contrast"
        description="Boosts gameplay contrast for targets, hazards, boundaries, and the line."
        checked={settings.highContrast}
        onToggle={() => setSettings((current) => ({ ...current, highContrast: !current.highContrast }))}
      />
    </div>
    <div className="mt-4 rounded-2xl border border-white/10 bg-slate-950/30 p-4 text-left text-sm text-slate-300">
      Settings apply immediately and stay saved on this device.
    </div>
  </div>
);

const ReplayPanel = ({ replay, error }: { replay: ReplayData | null; error?: string | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playbackMs, setPlaybackMs] = useState(0);
  const [playing, setPlaying] = useState(true);

  const timeline = useMemo(() => (replay ? buildReplayTimeline(replay) : null), [replay]);

  useEffect(() => {
    setPlaybackMs(0);
    setPlaying(true);
  }, [replay]);

  useEffect(() => {
    if (!timeline || !playing) return;

    let frameId = 0;
    let last = performance.now();

    const tick = (now: number) => {
      const delta = now - last;
      last = now;
      setPlaybackMs((current) => {
        const next = Math.min(timeline.totalDurationMs, current + delta);
        if (next >= timeline.totalDurationMs) {
          setPlaying(false);
        }
        return next;
      });
      frameId = requestAnimationFrame(tick);
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [timeline, playing]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !timeline) return;
    const context = canvas.getContext('2d');
    if (!context) return;

    drawReplayFrame(context, timeline, playbackMs);
  }, [timeline, playbackMs]);

  if (error) {
    return (
      <div className="w-full max-w-3xl rounded-2xl border border-rose-400/30 bg-slate-950/45 p-6 text-sm text-rose-200">
        {error}
      </div>
    );
  }

  if (!replay || !timeline) {
    return (
      <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-950/45 p-6 text-sm text-slate-300">
        Replay unavailable for this run.
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl rounded-2xl border border-white/10 bg-slate-950/45 p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 text-left">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">{replay.username}</div>
          <div className="mt-1 text-2xl font-semibold text-white">{replay.score} pts</div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <CompactStat label="Rank" value={replay.rank ? `#${replay.rank}` : '-'} accent="text-amber-200" />
          <CompactStat label="Puzzles" value={replay.puzzlesSolved.toString()} accent="text-cyan-200" />
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="aspect-[3/2] w-full rounded-2xl border border-cyan-200/10 bg-[#0f172a]"
      />
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          onClick={() => setPlaying((current) => !current)}
          className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-slate-100 transition hover:bg-white/10"
        >
          {playing ? 'Pause' : 'Play'}
        </button>
        <button
          onClick={() => {
            setPlaybackMs(0);
            setPlaying(true);
          }}
          className="rounded-full border border-cyan-300/25 bg-cyan-400/10 px-5 py-2 text-sm font-semibold uppercase tracking-[0.28em] text-cyan-100 transition hover:bg-cyan-400/20"
        >
          Restart
        </button>
        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={timeline.totalDurationMs}
            value={playbackMs}
            onChange={(event) => {
              setPlaybackMs(Number(event.target.value));
              setPlaying(false);
            }}
            className="w-full"
          />
        </div>
        <div className="font-mono text-sm text-slate-300">{formatReplayTime(playbackMs)} / {formatReplayTime(timeline.totalDurationMs)}</div>
      </div>
    </div>
  );
};

function drawReplayFrame(
  context: CanvasRenderingContext2D,
  timeline: ReturnType<typeof buildReplayTimeline>,
  playbackMs: number
) {
  context.clearRect(0, 0, 600, 400);
  context.fillStyle = '#0f172a';
  context.fillRect(0, 0, 600, 400);

  const activeSegment = timeline.segments.find((segment) => {
    const locomotionEnd = segment.attempt.releaseTimestampMs + segment.resultElapsedMs;
    return playbackMs >= segment.attempt.startedAtMs && playbackMs <= locomotionEnd;
  });

  const fallbackPuzzleIndex = activeSegment?.attempt.puzzleIndex ?? getLatestSolvedPuzzleIndex(timeline, playbackMs);
  const puzzle = timeline.puzzles[fallbackPuzzleIndex] ?? timeline.puzzles[0];
  if (!puzzle) return;

  drawReplayBounds(context);
  drawReplayHazards(context, puzzle.hazards);

  if (!activeSegment) {
    drawReplayTargets(context, puzzle.targets);
    return;
  }

  const collectedTargets = getCollectedTargetIndexes(activeSegment, playbackMs);
  const activeTargets = puzzle.targets.filter((_, index) => !collectedTargets.has(index));
  drawReplayTargets(context, activeTargets);

  if (playbackMs <= activeSegment.attempt.releaseTimestampMs) {
    const partialPath = activeSegment.attempt.points
      .filter((point) => point.t <= playbackMs)
      .map((point) => ({ x: point.x, y: point.y }));
    drawReplayLine(context, partialPath);
    return;
  }

  const locomotionElapsed = playbackMs - activeSegment.attempt.releaseTimestampMs;
  const step = Math.min(
    activeSegment.resultStep,
    Math.max(1, Math.round(locomotionElapsed / REPLAY_STEP_MS))
  );
  const headIndex = Math.min(
    activeSegment.snakePath.length - 1,
    activeSegment.normalizedGesture.length - 1 + step
  );
  const tailIndex = Math.max(0, headIndex - activeSegment.snakeLength + 1);
  drawReplayLine(context, activeSegment.snakePath.slice(tailIndex, headIndex + 1));

  const headPos = activeSegment.snakePath[headIndex];
  if (headPos) {
    for (const hit of activeSegment.targetHits) {
      if (hit.step <= step) {
        const ageMs = (step - hit.step) * REPLAY_STEP_MS;
        if (ageMs < 400) {
          const target = puzzle.targets[hit.targetIndex];
          if (target) {
            const progress = ageMs / 400;
            const radius = target.r + progress * 20;
            const alpha = 1 - Math.pow(progress, 2);
            context.strokeStyle = `rgba(253, 224, 71, ${alpha})`;
            context.lineWidth = 2;
            context.beginPath();
            context.arc(target.x, target.y, radius, 0, Math.PI * 2);
            context.stroke();
          }
        }
      }
    }

    if (step >= activeSegment.resultStep) {
      if (activeSegment.result === 'failure') {
        const ageMs = (step - activeSegment.resultStep) * REPLAY_STEP_MS;
        if (ageMs < 1000) {
          const alpha = 1 - (ageMs / 1000);
          context.fillStyle = `rgba(225, 29, 72, ${alpha * 0.6})`;
          context.beginPath();
          context.arc(headPos.x, headPos.y, 25 + (ageMs / 40), 0, Math.PI * 2);
          context.fill();
        }
      } else if (activeSegment.result === 'success') {
        const ageMs = (step - activeSegment.resultStep) * REPLAY_STEP_MS;
        if (ageMs < 1000) {
          const alpha = 1 - (ageMs / 1000);
          context.fillStyle = `rgba(52, 211, 153, ${alpha * 0.5})`;
          context.beginPath();
          context.arc(headPos.x, headPos.y, 30 + (ageMs / 30), 0, Math.PI * 2);
          context.fill();
        }
      }
    }
  }
}

function drawReplayBounds(context: CanvasRenderingContext2D) {
  context.strokeStyle = '#314158';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(0, 2);
  context.lineTo(600, 2);
  context.moveTo(0, 398);
  context.lineTo(600, 398);
  context.stroke();
}

function drawReplayHazards(context: CanvasRenderingContext2D, hazards: Array<{ x: number; y: number; r: number }>) {
  for (const hazard of hazards) {
    context.fillStyle = '#020617';
    context.beginPath();
    context.arc(hazard.x, hazard.y, hazard.r + 6, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#334155';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(hazard.x, hazard.y, hazard.r + 3, 0, Math.PI * 2);
    context.stroke();
    context.fillStyle = '#000000';
    context.beginPath();
    context.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
    context.fill();
  }
}

function drawReplayTargets(context: CanvasRenderingContext2D, targets: Array<{ x: number; y: number; r: number }>) {
  for (const target of targets) {
    context.fillStyle = 'rgba(103, 232, 249, 0.2)';
    context.beginPath();
    context.arc(target.x, target.y, target.r + 8, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#38bdf8';
    context.beginPath();
    context.arc(target.x, target.y, target.r, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#e0f2fe';
    context.lineWidth = 2;
    context.beginPath();
    context.arc(target.x, target.y, target.r - 4, 0, Math.PI * 2);
    context.stroke();
  }
}

function drawReplayLine(context: CanvasRenderingContext2D, path: Point[]) {
  if (path.length < 2) return;

  context.strokeStyle = 'rgba(103, 232, 249, 0.18)';
  context.lineWidth = 10;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(path[0]!.x, path[0]!.y);
  for (let i = 1; i < path.length; i++) {
    context.lineTo(path[i]!.x, path[i]!.y);
  }
  context.stroke();

  context.strokeStyle = '#f8fafc';
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(path[0]!.x, path[0]!.y);
  for (let i = 1; i < path.length; i++) {
    context.lineTo(path[i]!.x, path[i]!.y);
  }
  context.stroke();
}

function getCollectedTargetIndexes(segment: ReturnType<typeof buildReplayTimeline>['segments'][number], playbackMs: number) {
  const collected = new Set<number>();
  if (playbackMs <= segment.attempt.releaseTimestampMs) {
    return collected;
  }

  const locomotionElapsed = playbackMs - segment.attempt.releaseTimestampMs;
  const activeStep = Math.min(
    segment.resultStep,
    Math.max(1, Math.round(locomotionElapsed / REPLAY_STEP_MS))
  );
  for (const hit of segment.targetHits) {
    if (hit.step <= activeStep) {
      collected.add(hit.targetIndex);
    }
  }
  return collected;
}

function getLatestSolvedPuzzleIndex(timeline: ReturnType<typeof buildReplayTimeline>, playbackMs: number) {
  let index = 0;
  for (const segment of timeline.segments) {
    const segmentEnd = segment.attempt.releaseTimestampMs + segment.resultElapsedMs;
    if (playbackMs >= segmentEnd && segment.result === 'success') {
      index = Math.min(timeline.puzzles.length - 1, segment.attempt.puzzleIndex + 1);
    }
  }
  return index;
}

function formatReplayTime(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

const SettingToggle = ({
  label,
  description,
  checked,
  onToggle,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
}) => (
  <button
    onClick={onToggle}
    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-white/10 bg-slate-950/35 px-4 py-4 text-left transition hover:bg-slate-900/60"
  >
    <div className="min-w-0">
      <div className="text-sm font-semibold uppercase tracking-[0.28em] text-slate-100">{label}</div>
      <div className="mt-1 text-sm text-slate-400">{description}</div>
    </div>
    <div
      className={`relative h-8 w-14 shrink-0 rounded-full border transition ${
        checked ? 'border-cyan-300/50 bg-cyan-400/30' : 'border-white/10 bg-white/10'
      }`}
    >
      <div
        className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${
          checked ? 'left-7' : 'left-1'
        }`}
      />
    </div>
  </button>
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
const REPLAY_STEP_MS = 10;
