import './index.css';

import { StrictMode, useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { navigateTo } from '@devvit/web/client';
import { useCounter } from './hooks/useCounter';
import { createGame } from './DailyLineGame';
import type { BootstrapResponse } from '../shared/api';

export const App = () => {
  const { username, loading: initLoading } = useCounter();
  const [seed, setSeed] = useState<string>('Loading...');
  const [bootstrapLoading, setBootstrapLoading] = useState(true);
  const gameRef = useRef<HTMLDivElement>(null);

  // Fetch bootstrap details (verifying server route works)
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await fetch('/api/bootstrap');
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: BootstrapResponse = await res.json();
        setSeed(data.seed);
      } catch (err) {
        console.error('Failed to bootstrap game', err);
        setSeed('Error');
      } finally {
        setBootstrapLoading(false);
      }
    };
    void bootstrap();
  }, []);

  // Initialize and destroy Phaser Game
  useEffect(() => {
    if (!gameRef.current || bootstrapLoading || initLoading) return;

    const game = createGame(gameRef.current);

    return () => {
      game.destroy(true);
    };
  }, [bootstrapLoading, initLoading]);

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 p-4">
      <div className="flex flex-col items-center gap-2 max-w-md w-full text-center">
        <h1 className="text-3xl font-extrabold text-orange-600 dark:text-orange-500 tracking-tight">
          DAILY LINE
        </h1>
        <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">
          {initLoading ? 'Loading username...' : `Player: ${username ?? 'anonymous'}`}
        </p>
        <p className="text-xs text-gray-400 dark:text-gray-500">
          Seed: <span className="font-mono bg-gray-200 dark:bg-gray-800 px-1 py-0.5 rounded">{seed}</span>
        </p>
      </div>

      {/* Phaser Canvas Container */}
      <div 
        ref={gameRef} 
        className="w-full max-w-[600px] aspect-[3/2] border-4 border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden shadow-2xl bg-[#111827]"
      />

      <footer className="mt-8 flex gap-3 text-xs text-gray-500 dark:text-gray-400">
        <button
          className="cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
          onClick={() => navigateTo('https://developers.reddit.com/docs')}
        >
          Docs
        </button>
        <span className="text-gray-300 dark:text-gray-700">|</span>
        <button
          className="cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
          onClick={() => navigateTo('https://www.reddit.com/r/Devvit')}
        >
          r/Devvit
        </button>
        <span className="text-gray-300 dark:text-gray-700">|</span>
        <button
          className="cursor-pointer hover:text-gray-900 dark:hover:text-white transition-colors"
          onClick={() => navigateTo('https://discord.com/invite/R7yu2wh9Qz')}
        >
          Discord
        </button>
      </footer>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
