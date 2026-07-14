import { useEffect, useMemo, useRef, useState } from 'react';
import { smoothPath, type Point } from '../shared/geom';
import { buildReplayTimeline, type ReplayData } from '../shared/replay';

const REPLAY_STEP_MS = 10;
const SUCCESS_ADVANCE_DELAY_MS = 220;
const FAILURE_RESET_DELAY_MS = 320;

export const ReplayPanel = ({ replay, error }: { replay: ReplayData | null; error?: string | null }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [playbackMs, setPlaybackMs] = useState(0);
  const [playing, setPlaying] = useState(true);

  const timeline = useMemo(() => (replay ? buildReplayTimeline(replay) : null), [replay]);

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
      <div className="surface-panel w-full max-w-3xl rounded-[26px] p-6 text-sm accent-warm">
        {error}
      </div>
    );
  }

  if (!replay || !timeline) {
    return (
      <div className="surface-panel w-full max-w-3xl rounded-[26px] p-6 text-sm ink-muted">
        Replay unavailable for this run.
      </div>
    );
  }

  return (
    <div className="surface-panel w-full max-w-3xl rounded-[26px] p-4 sm:p-6">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3 text-left">
        <div className="min-w-0">
          <div className="label-kicker">{replay.username}</div>
          <div className="display-title mt-2 text-2xl">{replay.score} pts</div>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-sm ink-muted">
          <span className="rounded-full border soft-divider px-3 py-1">
            Rank <span className="numeric accent-warm">{replay.rank ? `#${replay.rank}` : '-'}</span>
          </span>
          <span className="rounded-full border soft-divider px-3 py-1">
            Puzzles <span className="numeric accent-moss">{replay.puzzlesSolved}</span>
          </span>
        </div>
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={400}
        className="aspect-[3/2] w-full rounded-[24px] border soft-divider bg-[rgb(var(--bg-rgb))]"
      />
      <div className="mt-4 rounded-[22px] border soft-divider bg-white/34 p-4">
        <div className="mb-2 flex items-center justify-between gap-3 text-sm ink-muted">
          <span>{playing ? 'Playing replay' : 'Replay paused'}</span>
          <span className="numeric">{formatReplayTime(playbackMs)} / {formatReplayTime(timeline.totalDurationMs)}</span>
        </div>
        <div>
          <input
            type="range"
            min={0}
            max={timeline.totalDurationMs}
            value={playbackMs}
            onChange={(event) => {
              setPlaybackMs(Number(event.target.value));
              setPlaying(false);
            }}
            className="range-elegant w-full"
          />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            onClick={() => setPlaying((current) => !current)}
            className="action-button action-primary px-5 py-2 text-sm"
          >
            {playing ? 'Pause' : 'Play'}
          </button>
          <button
            onClick={() => {
              setPlaybackMs(0);
              setPlaying(true);
            }}
            className="action-button action-secondary px-5 py-2 text-sm"
          >
            Restart
          </button>
        </div>
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
  context.fillStyle = '#f9f6f0';
  context.fillRect(0, 0, 600, 400);

  const activeSegment = timeline.segments.find((segment) => {
    return playbackMs >= segment.attempt.startedAtMs && playbackMs <= getSegmentVisibleEndMs(segment);
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
    const partialPath = smoothPath(
      activeSegment.attempt.points
        .filter((point) => point.t <= playbackMs)
        .map((point) => ({ x: point.x, y: point.y })),
      2
    );
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
  if (!headPos) return;

  for (const hit of activeSegment.targetHits) {
    if (hit.step <= step) {
      const ageMs = (step - hit.step) * REPLAY_STEP_MS;
      if (ageMs < 400) {
        const target = puzzle.targets[hit.targetIndex];
        if (target) {
          const progress = ageMs / 400;
          const radius = target.r + progress * 20;
          const alpha = 1 - Math.pow(progress, 2);
          context.strokeStyle = `rgba(28, 32, 38, ${alpha})`;
          context.lineWidth = 2;
          context.beginPath();
          context.arc(target.x, target.y, radius, 0, Math.PI * 2);
          context.stroke();
        }
      }
    }
  }

  if (step < activeSegment.resultStep) return;

  const ageMs = (step - activeSegment.resultStep) * REPLAY_STEP_MS;
  if (ageMs >= 1000) return;

  const alpha = 1 - (ageMs / 1000);
  if (activeSegment.result === 'failure') {
    context.fillStyle = `rgba(11, 12, 16, ${alpha * 0.8})`;
    context.beginPath();
    context.arc(headPos.x, headPos.y, 25 + (ageMs / 40), 0, Math.PI * 2);
    context.fill();
    return;
  }

  context.fillStyle = `rgba(28, 32, 38, ${alpha * 0.35})`;
  context.beginPath();
  context.arc(headPos.x, headPos.y, 30 + (ageMs / 30), 0, Math.PI * 2);
  context.fill();
}

function drawReplayBounds(context: CanvasRenderingContext2D) {
  context.strokeStyle = '#eae5db';
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
    context.fillStyle = '#0b0c10';
    context.beginPath();
    context.arc(hazard.x, hazard.y, hazard.r, 0, Math.PI * 2);
    context.fill();
  }
}

function drawReplayTargets(context: CanvasRenderingContext2D, targets: Array<{ x: number; y: number; r: number }>) {
  const targetColors = ['#2b59c3', '#2e8b57', '#c83e4d'];
  targets.forEach((target, i) => {
    const targetColor = targetColors[i % targetColors.length]!;
    
    context.globalAlpha = 0.3;
    context.fillStyle = targetColor;
    context.beginPath();
    context.arc(target.x, target.y, target.r + 8, 0, Math.PI * 2);
    context.fill();
    
    context.globalAlpha = 1.0;
    context.fillStyle = targetColor;
    context.beginPath();
    context.arc(target.x, target.y, target.r, 0, Math.PI * 2);
    context.fill();
  });
}

function drawReplayLine(context: CanvasRenderingContext2D, path: Point[]) {
  if (path.length < 2) return;

  context.strokeStyle = 'rgba(74, 85, 104, 0.2)';
  context.lineWidth = 10;
  context.lineJoin = 'round';
  context.lineCap = 'round';
  context.beginPath();
  context.moveTo(path[0]!.x, path[0]!.y);
  for (let i = 1; i < path.length; i++) {
    context.lineTo(path[i]!.x, path[i]!.y);
  }
  context.stroke();

  context.strokeStyle = 'rgba(28, 32, 38, 0.9)';
  context.lineWidth = 6;
  context.beginPath();
  context.moveTo(path[0]!.x, path[0]!.y);
  for (let i = 1; i < path.length; i++) {
    context.lineTo(path[i]!.x, path[i]!.y);
  }
  context.stroke();
  
  context.fillStyle = 'rgba(28, 32, 38, 0.9)';
  context.beginPath();
  context.arc(path[0]!.x, path[0]!.y, 3, 0, Math.PI * 2);
  context.fill();
  context.beginPath();
  context.arc(path[path.length - 1]!.x, path[path.length - 1]!.y, 3, 0, Math.PI * 2);
  context.fill();
}

function getCollectedTargetIndexes(
  segment: ReturnType<typeof buildReplayTimeline>['segments'][number],
  playbackMs: number
) {
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
    const segmentEnd = getSegmentVisibleEndMs(segment);
    if (playbackMs >= segmentEnd && segment.result === 'success') {
      index = Math.min(timeline.puzzles.length - 1, segment.attempt.puzzleIndex + 1);
    }
  }
  return index;
}

function getSegmentVisibleEndMs(segment: ReturnType<typeof buildReplayTimeline>['segments'][number]) {
  const resultAtMs = segment.attempt.releaseTimestampMs + segment.resultElapsedMs;
  return resultAtMs + (segment.result === 'success' ? SUCCESS_ADVANCE_DELAY_MS : FAILURE_RESET_DELAY_MS);
}

function formatReplayTime(ms: number) {
  const totalSeconds = Math.max(0, Math.round(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}

export default ReplayPanel;
