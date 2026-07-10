import './index.css';

import { navigateTo } from '@devvit/web/client';
import { context, requestExpandedMode } from '@devvit/web/client';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

export const Splash = () => {
  return (
    <div className="app-shell flex min-h-screen items-center px-4 py-6 sm:px-6">
      <div className="motion-rise mx-auto w-full max-w-xl">
        <section className="surface-panel-strong rounded-[30px] px-6 py-8 text-center sm:px-8 sm:py-10">
          <div className="mx-auto flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-full border soft-divider bg-white/40 p-3 sm:h-20 sm:w-20">
            <img className="object-contain" src="/snoo.png" alt="Snoo" />
          </div>

          <p className="label-kicker mt-6">Daily Line</p>
          <h1 className="display-title mt-4 text-4xl sm:text-5xl">One gesture. One run.</h1>
          <p className="body-copy mx-auto mt-4 max-w-md text-sm sm:text-base">
            Draw once, release, and let the line move.
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
              onClick={() => navigateTo('https://developers.reddit.com/docs')}
            >
              Docs
            </button>
          </div>

          <div className="mt-6 text-xs ink-muted">{context.username ?? 'Guest'} session</div>
        </section>
      </div>
    </div>
  );
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Splash />
  </StrictMode>
);
