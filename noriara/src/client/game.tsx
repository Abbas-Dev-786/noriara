import './index.css';

import { lazy, StrictMode, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Dispatch, ReactNode, SetStateAction } from 'react';
import { createRoot } from 'react-dom/client';
import type Phaser from 'phaser';
import type { GameCallbacks } from './DailyLineGame';
import { DEFAULT_GAME_SETTINGS, type GameSettings } from './gameSettings';
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
  EventConfig,
  EventCurrentResponse,
  SubmittedRunSummary,
} from '../shared/api';
import { ArchiveView } from './ArchiveView';
import { CommunityView } from './CommunityView';
import type { ReplayData, ReplayResponse } from '../shared/replay';

const ReplayPanel = lazy(() => import('./ReplayPanel'));
let dailyLineGameModulePromise: Promise<typeof import('./DailyLineGame')> | null = null;

function loadDailyLineGameModule() {
  if (!dailyLineGameModulePromise) {
    dailyLineGameModulePromise = import('./DailyLineGame');
  }
  return dailyLineGameModulePromise;
}

function preloadExpandedGameRuntime() {
  void loadDailyLineGameModule().then(({ preloadGameRuntime }) => preloadGameRuntime());
}

type GameState = 'bootstrap' | 'ready' | 'playing' | 'results' | 'error';
type PageView = 'home' | 'leaderboard' | 'stats' | 'settings' | 'replay' | 'archive' | 'event' | 'community';

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

function loadStoredSettings(): GameSettings {
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
}

export const App = () => {
  const [bootstrap, setBootstrap] = useState<BootstrapResponse | null>(null);
  const [gameState, setGameState] = useState<GameState>('bootstrap');
  const [pageView, setPageView] = useState<PageView>('home');
  const [sessionId, setSessionId] = useState(0);
  const [runMode, setRunMode] = useState<RunMode>('practice');
  const [leaderboardEntries, setLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [playerStats, setPlayerStats] = useState<PlayerStats | null>(null);
  const [activeEvent, setActiveEvent] = useState<EventConfig | null>(null);
  const [eventRun, setEventRun] = useState<SubmittedRunSummary | null>(null);
  const [eventLeaderboardEntries, setEventLeaderboardEntries] = useState<LeaderboardEntry[]>([]);
  const [settings, setSettings] = useState<GameSettings>(() => loadStoredSettings());
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
  const runVariantRef = useRef<'daily' | 'event' | 'community'>('daily');
  const communitySeedRef = useRef<string | null>(null);
  const officialRunIdRef = useRef<string | null>(null);
  const bootstrapRef = useRef<BootstrapResponse | null>(null);
  const activeEventRef = useRef<EventConfig | null>(null);
  const settingsRef = useRef<GameSettings>(DEFAULT_GAME_SETTINGS);

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

      fetch('/api/event/current')
        .then(res => res.json())
        .then((evtData: EventCurrentResponse) => {
          if (evtData.status === 'ok' && evtData.activeEvent) {
            setActiveEvent(evtData.activeEvent);
            setEventRun(evtData.currentRun);
            activeEventRef.current = evtData.activeEvent;
            setEventLeaderboardEntries(evtData.leaderboardPreview);
          }
        })
        .catch(console.error);

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
      setPageView('leaderboard');
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
      setPageView('stats');
    } catch (error) {
      console.error('Failed to load stats', error);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fetchBootstrap();
    }, 0);
    return () => window.clearTimeout(timer);
  }, [fetchBootstrap]);

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

  const startLocalRun = useCallback((mode: RunMode, variant: 'daily' | 'event' | 'community', runId: string | null, communitySeed?: string) => {
    runModeRef.current = mode;
    runVariantRef.current = variant;
    officialRunIdRef.current = runId;
    if (communitySeed) {
      communitySeedRef.current = communitySeed;
    }

    setRunMode(mode);
    setScore(0);
    setCombo(0);
    setTimeMs(variant === 'event' && activeEventRef.current ? activeEventRef.current.timerMs : 30000);
    setFinalResult(null);
    setSubmissionState({ status: 'idle' });
    setPageView('home');
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
      startLocalRun(data.mode, 'daily', data.runId);
    } catch (error) {
      console.error('Failed to start run', error);
      startLocalRun('practice', 'daily', null);
    }
  }, [startLocalRun]);

  const handleEventStart = useCallback(async () => {
    try {
      const res = await fetch('/api/event/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data: StartRunResponse = await res.json();
      startLocalRun(data.mode, 'event', data.runId);
    } catch (error) {
      console.error('Failed to start event run', error);
      startLocalRun('practice', 'event', null);
    }
  }, [startLocalRun]);

  const handleCommunityStart = useCallback((layoutId: string, seed: string) => {
    startLocalRun('practice', 'community', layoutId, seed);
  }, [startLocalRun]);

  const handlePracticeStart = useCallback(() => {
    startLocalRun('practice', 'daily', null);
  }, [startLocalRun]);

  const submitOfficialRun = useCallback(
    async (
      runId: string,
      runDate: string,
      runSeed: string,
      result: RunResult,
      telemetry: RunTelemetry
    ) => {
      setSubmissionState({ status: 'submitting' });
      const submitVariant = runVariantRef.current;
      const endpoint = submitVariant === 'event' ? '/api/event/submit' : '/api/run/submit';
      
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            runId,
            date: runDate,
            seed: submitVariant === 'event' && activeEventRef.current ? activeEventRef.current.seed : runSeed,
            runVariant: submitVariant,
            finalScore: result.score,
            puzzlesSolved: result.puzzlesSolved,
            maxCombo: result.maxCombo,
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
          const submitDate = runVariantRef.current === 'event' && activeEventRef.current
            ? activeEventRef.current.eventId
            : activeBootstrap.date;
          const submitSeed = runVariantRef.current === 'event' && activeEventRef.current
            ? activeEventRef.current.seed
            : activeBootstrap.seed;
          void submitOfficialRun(
            activeRunId,
            submitDate,
            submitSeed,
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

    let disposed = false;
    let activeGame: Phaser.Game | null = null;

    void loadDailyLineGameModule().then(async ({ createGame }) => {
      if (disposed || !gameRef.current) {
        return;
      }
      
      const variant = runVariantRef.current;
      let effectiveSeed = seed;
      if (variant === 'event' && activeEventRef.current) {
        effectiveSeed = activeEventRef.current.seed;
      } else if (variant === 'community' && communitySeedRef.current) {
        effectiveSeed = communitySeedRef.current;
      }
      const effectiveTimerMs = variant === 'event' && activeEventRef.current ? activeEventRef.current.timerMs : 30000;
      const effectivePuzzleCount = variant === 'event' && activeEventRef.current ? activeEventRef.current.puzzleCount : 30;
      
      activeGame = await createGame(gameRef.current, effectiveSeed, callbacks, settingsRef.current, {
        isEvent: variant === 'event',
        timerMs: effectiveTimerMs,
        puzzleCount: effectivePuzzleCount,
      });
      
      if (disposed) {
        activeGame.destroy(true);
        activeGame = null;
      }
    });

    return () => {
      disposed = true;
      activeGame?.destroy(true);
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
    setPageView('home');
    setGameState('ready');
  };

  const openReplay = useCallback(
    async (replayUsername: string, replayDate = dailyDate, replayVariant: 'daily' | 'event' = 'daily') => {
      if (!replayDate) return;
      setReplayLoading(true);
      setReplayError(null);
      try {
        const replayUrl =
          replayVariant === 'event'
            ? `/api/event/replay/${encodeURIComponent(replayUsername)}?eventId=${encodeURIComponent(replayDate)}`
            : `/api/replay/${encodeURIComponent(replayUsername)}?date=${encodeURIComponent(replayDate)}`;
        const res = await fetch(replayUrl);
        if (!res.ok) {
          if (res.status === 404) {
             throw new Error('Replay not found or has expired.');
          }
          throw new Error(`Failed to load replay (${res.status}).`);
        }
        const data: ReplayResponse = await res.json();
        setActiveReplay(data.replay);
        setPageView('replay');
      } catch (error) {
        console.error('Failed to load replay', error);
        setReplayError(error instanceof Error ? error.message : 'Unknown error');
        setActiveReplay(null);
        setPageView('replay');
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
  const replayPanelKey = activeReplay ? `${activeReplay.username}-${activeReplay.acceptedAt}` : 'replay-empty';
  const isHomeView = pageView === 'home';
  const gameWarmupProps = {
    onMouseEnter: preloadExpandedGameRuntime,
    onFocus: preloadExpandedGameRuntime,
    onTouchStart: preloadExpandedGameRuntime,
  };

  return (
    <div className="app-shell">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col px-4 py-4 sm:px-6">
        <header className="surface-panel motion-rise mb-4 flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="seal-mark text-[12px]">N</span>
              <span className="display-title text-xl tracking-widest">Noriara</span>
            </div>
            <span className="hidden h-4 w-px bg-[rgba(var(--line-soft-rgb),0.9)] sm:block" />
            <span className="text-sm ink-muted">{dailyDate || 'Loading board'}</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs ink-muted">
            <span className="rounded-full border soft-divider px-3 py-1">{username ?? 'Practice'}</span>
            {playerStats && <span className="rounded-full border soft-divider px-3 py-1">Streak {playerStats.currentStreak}</span>}
            {bestLocalScore !== null && <span className="rounded-full border soft-divider px-3 py-1">Best {bestLocalScore}</span>}
          </div>
        </header>

        <main className="relative mx-auto flex w-full max-w-4xl flex-1 flex-col">
          {gameState === 'playing' && isHomeView && (
            <div className="motion-soft mb-4 grid grid-cols-3 gap-3">
              <HudStat label="Time" value={formatTime(timeMs)} accent="accent-warm" />
              <HudStat label="Score" value={score.toString()} accent="accent-moss" />
              <HudStat label="Combo" value={`x${combo}`} accent={combo > 1 ? 'accent-gold' : 'ink-muted'} />
            </div>
          )}

          {gameState === 'bootstrap' && isHomeView && (
            <div className="surface-panel-strong flex aspect-[3/2] items-center justify-center rounded-[30px]">
              <div className="label-kicker">
                Loading daily seed...
              </div>
            </div>
          )}

          {gameState === 'error' && isHomeView && (
            <div className="surface-panel-strong flex aspect-[3/2] flex-col items-center justify-center rounded-[30px] px-6 text-center">
              <h2 className="display-title mb-3 text-2xl accent-warm">Bootstrap failed</h2>
              <p className="body-copy mb-6 max-w-md text-sm">
                The game could not load today&apos;s daily state from the server.
              </p>
              <button
                onClick={() => void fetchBootstrap()}
                className="action-button action-primary"
              >
                Retry
              </button>
            </div>
          )}

          <div
            ref={gameRef}
            className={`w-full aspect-[3/2] overflow-hidden rounded-[30px] border border-[rgba(var(--line-rgb),0.4)] bg-[rgb(var(--bg-rgb))] shadow-[0_8px_40px_rgba(15,23,42,0.08),inset_0_1px_0_rgba(255,255,255,0.5)] ${
              !isHomeView || gameState === 'bootstrap' || gameState === 'error' ? 'hidden' : 'block'
            }`}
          />

          {isHomeView && gameState === 'ready' && bootstrap && (
            <OverlayCard>
              <div className="motion-rise mx-auto flex w-full max-w-2xl flex-col items-center justify-center text-center">
                <div className="surface-panel rounded-[28px] px-6 py-8 sm:px-8 sm:py-10">
                  <p className="label-kicker">Today's run</p>
                  <h2 className="display-title brush-stroke mt-4 text-4xl sm:text-5xl">
                    One Stroke
                  </h2>
                  <p className="body-copy mx-auto mt-4 max-w-md text-sm sm:text-base">
                    One stroke. Thirty seconds. The same board for everyone.
                  </p>

                  {officialSubmitted && bootstrap.currentRun ? (
                    <div className="mt-5 rounded-[22px] border soft-divider bg-white/38 px-4 py-4 text-sm">
                      <span className="accent-moss">Official run submitted.</span>{' '}
                      <span className="numeric">#{bootstrap.currentRun.rank}</span> with{' '}
                      <span className="numeric">{bootstrap.currentRun.score}</span>.
                    </div>
                  ) : !bootstrap.loggedIn ? (
                    <div className="mt-5 rounded-[22px] border soft-divider bg-white/38 px-4 py-4 text-sm ink-muted">
                      Practice is available now. Official ranking requires Reddit login.
                    </div>
                  ) : null}

                  <div className="mt-6 flex flex-wrap justify-center gap-3">
                    {canStartOfficial && (
                      <button
                        onClick={() => void handleOfficialStart()}
                        className="action-button action-primary"
                        {...gameWarmupProps}
                      >
                        Official Run
                      </button>
                    )}
                    <button
                      onClick={handlePracticeStart}
                      className="action-button action-secondary"
                      {...gameWarmupProps}
                    >
                      {canStartOfficial ? 'Practice' : 'Start Practice'}
                    </button>
                    <button
                      onClick={() => setPageView('community')}
                      className="action-button action-secondary"
                    >
                      Community Layouts
                    </button>
                    {activeEvent && (
                      <button
                        onClick={() => setPageView('event')}
                        className="action-button action-secondary"
                      >
                        Event: {activeEvent.label}
                      </button>
                    )}
                    {officialSubmitted && bootstrap.currentRun?.hasReplay && username && (
                      <button onClick={() => void openReplay(username)} className="action-button action-secondary">
                        Replay
                      </button>
                    )}
                  </div>

                  <div className="mt-5 flex flex-wrap justify-center gap-x-5 gap-y-3 text-sm ink-muted">
                    <button onClick={() => void fetchLeaderboard()} className="transition-colors hover:text-[rgb(var(--ink-rgb))]">
                      Leaderboard
                    </button>
                    {bootstrap.loggedIn && (
                      <button onClick={() => void fetchStats()} className="transition-colors hover:text-[rgb(var(--ink-rgb))]">
                        Stats
                      </button>
                    )}
                    <button onClick={() => setPageView('settings')} className="transition-colors hover:text-[rgb(var(--ink-rgb))]">
                      Settings
                    </button>
                  </div>
                </div>
              </div>
            </OverlayCard>
          )}

          {isHomeView && gameState === 'results' && finalResult && (
            <OverlayCard>
              <div className="motion-rise mx-auto grid w-full max-w-3xl gap-4">
                <section className="surface-panel rounded-[26px] p-6 sm:p-8">
                  <p className="label-kicker">
                    {runMode === 'official' ? 'Official run complete' : 'Practice run complete'}
                  </p>
                  <h2 className="display-title brush-stroke mt-4 text-4xl sm:text-[3rem]">Time's Up!</h2>

                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <ResultStat label="Final Score" value={finalResult.score.toString()} accent="accent-warm" icon={<TinyIcon>S</TinyIcon>} />
                    <ResultStat label="Puzzles" value={finalResult.puzzlesSolved.toString()} accent="accent-moss" icon={<TinyIcon>P</TinyIcon>} />
                    <ResultStat label="Max Combo" value={`x${finalResult.maxCombo}`} accent="accent-gold" icon={<TinyIcon>C</TinyIcon>} />
                    <ResultStat
                      label="Local Best"
                      value={(bestLocalScore ?? finalResult.score).toString()}
                      accent="accent-mist"
                      icon={<TinyIcon>B</TinyIcon>}
                    />
                  </div>

                  <div className="mt-5 space-y-3">
                    <SubmissionBanner submissionState={submissionState} />
                    <PersonalBestBanner submissionState={submissionState} />
                  </div>
                  {playerStats && (
                    <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <CompactStat label="Streak" value={playerStats.currentStreak.toString()} accent="accent-moss" icon={<TinyIcon>S</TinyIcon>} />
                      <CompactStat label="Longest" value={playerStats.longestStreak.toString()} accent="accent-gold" icon={<TinyIcon>L</TinyIcon>} />
                      <CompactStat
                        label="Best Rank"
                        value={playerStats.bestRank ? `#${playerStats.bestRank}` : '--'}
                        accent="accent-warm"
                        icon={<TinyIcon>R</TinyIcon>}
                      />
                      <CompactStat
                        label="Solved"
                        value={playerStats.totalPuzzlesSolved.toString()}
                        accent="accent-mist"
                        icon={<TinyIcon>P</TinyIcon>}
                      />
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap gap-3">
                    <button onClick={handlePlayAgain} className="action-button action-primary">
                      Practice Again
                    </button>
                    <button onClick={() => void fetchLeaderboard()} className="action-button action-secondary">
                      Leaderboard
                    </button>
                    {submissionState.status === 'accepted' && submissionState.rank !== null && submissionState.replayAvailable && (
                      <button onClick={() => username && void openReplay(username)} className="action-button action-secondary">
                        Replay
                      </button>
                    )}
                    <button onClick={() => setPageView('settings')} className="action-button action-subtle">
                      Settings
                    </button>
                    {bootstrap?.loggedIn && (
                      <button onClick={() => void fetchStats()} className="action-button action-subtle">
                        Stats
                      </button>
                    )}
                  </div>
                </section>
              </div>
            </OverlayCard>
          )}

          {pageView === 'leaderboard' && (
            <PageSection
              title="Daily Leaderboard"
              onBack={() => setPageView('home')}
            >
              <div className="mb-4 flex justify-end px-4">
                <button
                  onClick={() => setPageView('archive')}
                  className="action-button action-secondary px-3 py-1 text-sm"
                >
                  Past Archives
                </button>
              </div>
              <LeaderboardTable entries={leaderboardEntries} onOpenReplay={openReplay} />
            </PageSection>
          )}

          {pageView === 'archive' && (
            <div className="absolute inset-0 z-50 flex items-center justify-center bg-[rgba(var(--background-rgb),0.9)] p-4 sm:p-6 md:p-12">
              <div className="relative flex h-full w-full max-w-4xl flex-col rounded-xl bg-[rgb(var(--surface-rgb))] shadow-2xl">
                <ArchiveView
                  onBack={() => setPageView('leaderboard')}
                  onOpenReplay={openReplay}
                />
              </div>
            </div>
          )}

          {pageView === 'event' && activeEvent && (
            <PageSection title="Weekly Event" onBack={() => setPageView('home')}>
              <div className="surface-panel w-full max-w-3xl rounded-[26px] p-6">
                <h3 className="mb-2 text-xl font-bold">{activeEvent.label}</h3>
                <p className="mb-4 text-sm opacity-80">
                  Timer: {activeEvent.timerMs / 1000}s | Puzzles: {activeEvent.puzzleCount}
                </p>
                {eventRun ? (
                  <div className="rounded-[18px] bg-[rgba(var(--ink-rgb),0.05)] p-4 text-center">
                    <p className="font-bold text-[rgb(var(--primary-rgb))]">Run Completed</p>
                    <p className="mt-1 text-2xl font-bold">{eventRun.score} pts</p>
                    <p className="text-sm opacity-60">Rank: {eventRun.rank ?? '-'}</p>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      void handleEventStart();
                    }}
                    className="action-button action-primary w-full"
                  >
                    Start Event Run
                  </button>
                )}
              </div>
              
              <div className="mt-8">
                <h4 className="mb-4 text-center text-lg font-bold">Event Leaderboard Preview</h4>
                <LeaderboardTable
                  entries={eventLeaderboardEntries}
                  onOpenReplay={(replayUsername) => void openReplay(replayUsername, activeEvent.eventId, 'event')}
                />
              </div>
            </PageSection>
          )}

          {pageView === 'community' && (
            <PageSection title="Community Layouts" onBack={() => setPageView('home')}>
              <CommunityView onStartCommunityRun={handleCommunityStart} />
            </PageSection>
          )}

          {pageView === 'stats' && (
            <PageSection
              title="Player stats"
              onBack={() => setPageView('home')}
            >
              <StatsPanel playerStats={playerStats} />
            </PageSection>
          )}

          {pageView === 'settings' && (
            <PageSection
              title="Accessibility and feedback"
              onBack={() => setPageView('home')}
            >
              <SettingsPanel settings={settings} setSettings={setSettings} />
            </PageSection>
          )}

          {pageView === 'replay' && (
            <PageSection
              title="Replay viewer"
              onBack={() => setPageView('home')}
            >
              {replayLoading ? (
                <div className="surface-panel w-full max-w-3xl rounded-[26px] p-6 text-sm ink-muted">
                  Loading replay...
                </div>
              ) : (
                <Suspense
                  fallback={
                    <div className="surface-panel w-full max-w-3xl rounded-[26px] p-6 text-sm ink-muted">
                      Loading replay viewer...
                    </div>
                  }
                >
                  <ReplayPanel key={replayPanelKey} replay={activeReplay} error={replayError} />
                </Suspense>
              )}
            </PageSection>
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
  <div className="surface-panel motion-soft rounded-[22px] px-4 py-3">
    <div className="label-kicker">{label}</div>
    <div className={`numeric mt-2 text-2xl font-semibold ${accent}`}>{value}</div>
  </div>
);

type ResultStatProps = {
  label: string;
  value: string;
  accent: string;
  icon?: ReactNode;
};

const ResultStat = ({ label, value, accent, icon }: ResultStatProps) => (
  <div className="surface-panel rounded-[24px] p-4 text-left">
    <div className="flex items-center gap-2">
      {icon}
      <div className="label-kicker">{label}</div>
    </div>
    <div className={`numeric mt-3 text-3xl font-semibold ${accent}`}>{value}</div>
  </div>
);

const CompactStat = ({ label, value, accent, icon }: ResultStatProps) => (
  <div className="rounded-[20px] border soft-divider bg-white/34 p-4 text-left">
    <div className="flex items-center gap-2">
      {icon}
      <div className="label-kicker">{label}</div>
    </div>
    <div className={`numeric mt-2 text-xl font-semibold ${accent}`}>{value}</div>
  </div>
);

const TinyIcon = ({ children }: { children: ReactNode }) => (
  <span className="seal-mark h-7 w-7 text-[11px]">{children}</span>
);

const SubmissionBanner = ({ submissionState }: { submissionState: SubmissionState }) => {
  if (submissionState.status === 'idle') return null;
  if (submissionState.status === 'submitting') {
    return <p className="text-sm accent-mist">Submitting official run to the server...</p>;
  }
  if (submissionState.status === 'accepted') {
    return (
      <p className="rounded-[20px] border soft-divider bg-white/35 px-4 py-3 text-sm accent-moss">
        Official run accepted{submissionState.rank ? `, current rank ${submissionState.rank}.` : '.'}
        {!submissionState.replayAvailable ? ' Replay storage unavailable for this run.' : ''}
      </p>
    );
  }
  return (
    <p className="rounded-[20px] border soft-divider bg-white/35 px-4 py-3 text-sm accent-warm">
      Official submission rejected: {submissionState.reason}
    </p>
  );
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

  return <p className="rounded-[20px] border soft-divider bg-white/35 px-4 py-3 text-sm accent-gold">{messages.join(' ')}</p>;
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
      <div className="surface-panel w-full max-w-3xl rounded-[26px] p-4">
        <div className="px-3 py-6 text-center text-sm ink-muted">No submissions yet.</div>
      </div>
    );
  }

  return (
    <div className="surface-panel w-full max-w-3xl rounded-[26px] p-3 sm:p-4">
      <div className="label-kicker hidden grid-cols-[56px_minmax(0,1fr)_120px_90px] gap-3 px-3 md:grid">
        <span>Rank</span>
        <span>Player</span>
        <span className="text-right">Score</span>
        <span className="text-right">Puzzles</span>
      </div>

      <div className="space-y-2 md:mt-3">
        {entries.map((entry) => (
          <article
            key={`${entry.rank}-${entry.username}`}
            className={`rounded-[20px] border px-3 py-2.5 text-sm ${
              entry.isCurrentUser
                ? 'border-[rgba(var(--accent-rgb),0.26)] bg-[rgba(var(--accent-rgb),0.08)] text-[rgb(var(--ink-rgb))]'
                : 'border-[rgba(var(--line-soft-rgb),0.55)] bg-white/5 text-[rgb(var(--ink-rgb))]'
            }`}
          >
            <div className="flex items-start justify-between gap-3 md:hidden">
              <div className="min-w-0">
                <div className="label-kicker">Player</div>
                <div className="mt-1 truncate text-base font-semibold">{entry.username}</div>
              </div>
              <div className="numeric shrink-0 rounded-full border soft-divider px-3 py-1 text-xs ink-muted">
                #{entry.rank}
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-3 md:hidden">
              <MobileLeaderboardStat label="Score" value={entry.score.toString()} accent="text-amber-200" />
              <MobileLeaderboardStat
                label="Puzzles"
                value={entry.puzzlesSolved.toString()}
                accent="text-cyan-200"
              />
            </div>
            {entry.hasReplay && (
              <div className="mt-2.5 md:hidden">
                <button
                  onClick={() => onOpenReplay(entry.username)}
                  className="action-button action-subtle w-full py-2 text-center text-[11px]"
                >
                  Watch Replay
                </button>
              </div>
            )}

            <div className="hidden min-w-0 grid-cols-[56px_minmax(0,1fr)_120px_90px] items-center gap-3 md:grid">
              <span className="numeric ink-muted">#{entry.rank}</span>
              <span className="truncate">{entry.username}</span>
              <span className="numeric text-right accent-warm">{entry.score}</span>
              <span className="numeric text-right">{entry.puzzlesSolved}</span>
              {entry.hasReplay && (
                <button
                  onClick={() => onOpenReplay(entry.username)}
                  className="action-button action-subtle col-span-4 py-2 text-[11px]"
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
  <div className="rounded-[18px] border soft-divider bg-white/34 p-3 text-left">
    <div className="label-kicker">{label}</div>
    <div className={`numeric mt-2 text-lg font-semibold ${accent}`}>{value}</div>
  </div>
);

const StatsPanel = ({ playerStats }: { playerStats: PlayerStats | null }) => {
  if (!playerStats) {
    return (
      <div className="surface-panel w-full max-w-3xl rounded-[26px] p-6 text-sm ink-muted">
        No official stats yet. Submit an official run to start your streak.
      </div>
    );
  }

  return (
    <div className="surface-panel w-full max-w-3xl rounded-[26px] p-4 sm:p-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <CompactStat label="Current Streak" value={playerStats.currentStreak.toString()} accent="accent-moss" icon={<TinyIcon>S</TinyIcon>} />
        <CompactStat label="Longest Streak" value={playerStats.longestStreak.toString()} accent="accent-gold" icon={<TinyIcon>L</TinyIcon>} />
        <CompactStat label="Best Score" value={playerStats.bestScore.toString()} accent="accent-warm" icon={<TinyIcon>B</TinyIcon>} />
        <CompactStat
          label="Best Rank"
          value={playerStats.bestRank ? `#${playerStats.bestRank}` : '-'}
          accent="accent-mist"
          icon={<TinyIcon>R</TinyIcon>}
        />
        <CompactStat
          label="Highest Puzzle"
          value={playerStats.highestPuzzleReached.toString()}
          accent="accent-moss"
          icon={<TinyIcon>P</TinyIcon>}
        />
        <CompactStat
          label="Official Runs"
          value={playerStats.totalOfficialRuns.toString()}
          accent="accent-gold"
          icon={<TinyIcon>O</TinyIcon>}
        />
      </div>
      <div className="mt-3 rounded-[22px] border soft-divider bg-white/32 p-4 text-left text-sm ink-muted">
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
  setSettings: Dispatch<SetStateAction<GameSettings>>;
}) => (
  <div className="surface-panel w-full max-w-3xl rounded-[26px] p-4 sm:p-6">
    <div className="space-y-3">
      <SettingToggle
        label="Sound"
        description="Play game tones."
        icon={<TinyIcon>A</TinyIcon>}
        checked={settings.soundEnabled}
        onToggle={() => setSettings((current) => ({ ...current, soundEnabled: !current.soundEnabled }))}
      />
      <SettingToggle
        label="Haptics"
        description="Use vibration feedback where supported."
        icon={<TinyIcon>H</TinyIcon>}
        checked={settings.hapticsEnabled}
        onToggle={() => setSettings((current) => ({ ...current, hapticsEnabled: !current.hapticsEnabled }))}
      />
      <SettingToggle
        label="Reduced Motion"
        description="Reduce flashes and shake."
        icon={<TinyIcon>M</TinyIcon>}
        checked={settings.reducedMotion}
        onToggle={() => setSettings((current) => ({ ...current, reducedMotion: !current.reducedMotion }))}
      />
      <SettingToggle
        label="High Contrast"
        description="Increase gameplay contrast."
        icon={<TinyIcon>C</TinyIcon>}
        checked={settings.highContrast}
        onToggle={() => setSettings((current) => ({ ...current, highContrast: !current.highContrast }))}
      />
    </div>
    <div className="mt-4 rounded-[22px] border soft-divider bg-white/32 p-4 text-left text-sm ink-muted">
      Settings apply immediately and stay saved on this device.
    </div>
  </div>
);

const SettingToggle = ({
  label,
  description,
  checked,
  onToggle,
  icon,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  icon?: ReactNode;
}) => (
  <button
    onClick={onToggle}
    className="flex w-full items-center justify-between gap-4 rounded-[22px] border soft-divider bg-white/5 px-4 py-4 text-left transition hover:bg-white/10"
  >
    <div className="min-w-0">
      <div className="flex items-center gap-2">
        {icon}
        <div className="label-kicker">{label}</div>
      </div>
      <div className="mt-2 text-sm ink-muted">{description}</div>
    </div>
    <div
      className={`relative h-8 w-14 shrink-0 rounded-full border transition ${
        checked
          ? 'border-[rgba(var(--accent-rgb),0.45)] bg-[rgba(var(--accent-rgb),0.22)]'
          : 'border-[rgba(var(--line-soft-rgb),0.8)] bg-white/10'
      }`}
    >
      <div
        className={`absolute top-1 h-6 w-6 rounded-full bg-[rgb(251,248,242)] transition ${
          checked ? 'left-7' : 'left-1'
        }`}
      />
    </div>
  </button>
);

const OverlayCard = ({ children }: { children: ReactNode }) => (
  <div className="surface-overlay absolute inset-0 overflow-y-auto overflow-x-hidden rounded-[30px] px-4 py-5 sm:px-6 sm:py-6">
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-stretch justify-start">
      {children}
    </div>
  </div>
);

const PageSection = ({
  title,
  onBack,
  children,
}: {
  title: string;
  onBack: () => void;
  children: ReactNode;
}) => (
  <section className="motion-rise flex flex-1 flex-col">
    <div className="mb-4 flex items-center justify-between gap-3">
      <div>
        <div className="title-divider">
          <span className="seal-mark text-[10px]">N</span>
          <p className="label-kicker">{title}</p>
        </div>
      </div>
      <button onClick={onBack} className="action-button action-subtle px-4 py-2">
        Back
      </button>
    </div>
    <div className="flex flex-1 flex-col items-center">
      {children}
    </div>
  </section>
);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
