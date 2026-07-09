import './index.css';

import { StrictMode, useEffect, useRef, useState, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { useCounter } from './hooks/useCounter';
import { createGame, GameCallbacks } from './DailyLineGame';
import type Phaser from 'phaser';
import type { BootstrapResponse } from '../shared/api';

type GameState = 'bootstrap' | 'ready' | 'playing' | 'results';

export const App = () => {
  const { username } = useCounter();
  const [seed, setSeed] = useState<string>('');
  const [gameState, setGameState] = useState<GameState>('bootstrap');
  
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [timeMs, setTimeMs] = useState(30000);
  const [finalResult, setFinalResult] = useState<{score: number, puzzlesSolved: number, maxCombo: number} | null>(null);
  
  const gameRef = useRef<HTMLDivElement>(null);
  const phaserSceneRef = useRef<(Phaser.Scene & { startCountdown: () => void }) | null>(null);

  const fetchBootstrap = useCallback(async () => {
    try {
      const res = await fetch('/api/bootstrap');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: BootstrapResponse = await res.json();
      setSeed(data.seed);
      setGameState('ready');
    } catch (err) {
      console.error('Failed to bootstrap game', err);
      setSeed('error');
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void fetchBootstrap();
  }, [fetchBootstrap]);

  useEffect(() => {
    // Only mount Phaser if we have the seed and the container
    if (!gameRef.current || !seed || seed === 'error') return;

    const callbacks: GameCallbacks = {
      onScoreChange: (s, c) => {
        setScore(s);
        setCombo(c);
      },
      onTimeChange: (t) => setTimeMs(t),
      onFinish: (result) => {
        setFinalResult(result);
        setGameState('results');
      },
      onReady: (scene) => {
        phaserSceneRef.current = scene;
      }
    };

    const game = createGame(gameRef.current, seed, callbacks);

    return () => {
      game.destroy(true);
      phaserSceneRef.current = null;
    };
  }, [seed]); // Do NOT depend on gameState, otherwise Phaser re-mounts when we click start

  const handleStart = () => {
    if (phaserSceneRef.current) {
      setGameState('playing');
      setScore(0);
      setCombo(0);
      setTimeMs(30000);
      phaserSceneRef.current.startCountdown();
    }
  };
  
  const handlePlayAgain = () => {
    // Resetting state to trigger a full Phaser re-mount
    setGameState('ready');
    setFinalResult(null);
  };

  const formatTime = (ms: number) => {
    const s = Math.ceil(ms / 1000);
    return `00:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 font-sans">
      
      {/* Top Header / HUD */}
      <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-white/10 dark:bg-black/20 backdrop-blur-md z-10 border-b border-gray-200 dark:border-gray-800">
        <div className="flex flex-col">
          <span className="font-extrabold text-orange-600 tracking-wide">DAILY LINE</span>
          <span className="text-[10px] text-gray-500 uppercase tracking-widest">{username ?? 'anonymous'}</span>
        </div>
        
        {gameState === 'playing' && (
          <div className="flex gap-6 items-center">
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Time</span>
              <span className="font-mono text-xl font-bold">{formatTime(timeMs)}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Score</span>
              <span className="font-mono text-xl font-bold text-green-500">{score}</span>
            </div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] uppercase text-gray-500 font-bold tracking-widest">Combo</span>
              <span className={`font-mono text-xl font-bold ${combo > 2 ? 'text-orange-500' : 'text-gray-400'}`}>x{combo}</span>
            </div>
          </div>
        )}
      </div>

      {/* Main Game Container */}
      <div className="relative w-full max-w-2xl mt-16 px-4">
        
        {/* Loading State */}
        {gameState === 'bootstrap' && (
          <div className="w-full aspect-[3/2] flex justify-center items-center rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-800 shadow-xl">
            <div className="animate-pulse text-gray-400 font-semibold tracking-widest">LOADING DAILY SEED...</div>
          </div>
        )}
        
        {/* Phaser Surface */}
        <div 
          ref={gameRef} 
          className={`w-full aspect-[3/2] rounded-xl overflow-hidden shadow-2xl border-4 border-gray-200 dark:border-gray-700 bg-[#111827] transition-opacity duration-300 ${
            (gameState === 'ready' || gameState === 'playing') ? 'opacity-100' : 'hidden'
          }`}
        />
        
        {/* Ready Overlay */}
        {gameState === 'ready' && (
          <div className="absolute inset-0 m-4 flex flex-col justify-center items-center bg-black/60 backdrop-blur-sm rounded-xl text-white">
            <h2 className="text-2xl font-bold mb-2">Today's Challenge</h2>
            <p className="text-gray-300 font-mono text-sm bg-black/40 px-3 py-1 rounded mb-6">Seed: {seed}</p>
            <button 
              onClick={handleStart}
              className="px-8 py-3 bg-orange-600 hover:bg-orange-500 transition-colors rounded-full font-bold uppercase tracking-widest shadow-lg transform hover:scale-105 active:scale-95"
            >
              Start Run
            </button>
          </div>
        )}

        {/* Results Overlay */}
        {gameState === 'results' && finalResult && (
          <div className="w-full aspect-[3/2] flex flex-col justify-center items-center bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-2xl p-6 relative overflow-hidden">
            <div className="absolute -top-10 -right-10 w-40 h-40 bg-orange-500/20 rounded-full blur-3xl"></div>
            
            <h2 className="text-3xl font-black mb-8 tracking-tighter text-gray-900 dark:text-white">TIME'S UP!</h2>
            
            <div className="grid grid-cols-2 gap-4 w-full max-w-sm mb-8">
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg flex flex-col items-center">
                <span className="text-xs uppercase text-gray-500 font-bold tracking-widest mb-1">Final Score</span>
                <span className="text-3xl font-mono font-bold text-orange-500">{finalResult.score}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg flex flex-col items-center justify-center">
                <span className="text-xs uppercase text-gray-500 font-bold tracking-widest mb-1">Puzzles</span>
                <span className="text-xl font-mono font-bold text-gray-800 dark:text-gray-200">{finalResult.puzzlesSolved}</span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 p-4 rounded-lg flex flex-col items-center justify-center col-span-2">
                <span className="text-xs uppercase text-gray-500 font-bold tracking-widest mb-1">Max Combo</span>
                <span className="text-xl font-mono font-bold text-gray-800 dark:text-gray-200">x{finalResult.maxCombo}</span>
              </div>
            </div>

            <button 
              onClick={handlePlayAgain}
              className="px-8 py-3 bg-gray-900 dark:bg-white text-white dark:text-gray-900 hover:opacity-90 transition-opacity rounded-full font-bold uppercase tracking-widest shadow-lg"
            >
              Practice Again
            </button>
          </div>
        )}

      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
