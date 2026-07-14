import { useEffect, useState } from 'react';
import type {
  CommunityLayout,
  CommunityListResponse,
  CommunitySubmitRequest,
  CommunitySubmitResponse,
  StartRunResponse,
} from '../shared/api';

interface CommunityViewProps {
  onStartCommunityRun: (layoutId: string, seed: string) => void;
}

const EMPTY_SUBMISSION: CommunitySubmitRequest = {
  title: '',
  note: '',
  seed: '',
  mechanics: ['core'],
};

export function CommunityView({ onStartCommunityRun }: CommunityViewProps) {
  const [layouts, setLayouts] = useState<CommunityLayout[]>([]);
  const [submission, setSubmission] = useState<CommunitySubmitRequest>(EMPTY_SUBMISSION);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const loadLayouts = async () => {
    try {
      const res = await fetch('/api/community/layouts');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: CommunityListResponse = await res.json();
      setLayouts(data.layouts);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to load community layouts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadLayouts();
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const handlePlayClick = async (layoutId: string, seed: string) => {
    try {
      const res = await fetch('/api/community/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ layoutId }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: StartRunResponse = await res.json();
      onStartCommunityRun(data.runId ?? layoutId, seed);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to start community layout.');
    }
  };

  const submitLayout = async () => {
    setSubmitting(true);
    setMessage(null);
    try {
      const res = await fetch('/api/community/layouts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submission),
      });
      const data = (await res.json()) as CommunitySubmitResponse | { reason?: string };
      if (!res.ok) {
        throw new Error('reason' in data && data.reason ? data.reason : `HTTP ${res.status}`);
      }
      setSubmission(EMPTY_SUBMISSION);
      setMessage('Submitted for moderator review.');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to submit layout.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-3xl space-y-5">
      <section className="surface-panel rounded-[26px] p-4 sm:p-6">
        <h3 className="mb-4 text-xl font-bold">Submit a Layout</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <input
            value={submission.title}
            onChange={(event) => setSubmission((current) => ({ ...current, title: event.target.value }))}
            maxLength={48}
            placeholder="Layout title"
            className="rounded-[14px] border soft-divider bg-white/35 px-3 py-2 text-sm"
          />
          <input
            value={submission.seed}
            onChange={(event) => setSubmission((current) => ({ ...current, seed: event.target.value }))}
            maxLength={32}
            placeholder="Seed"
            className="rounded-[14px] border soft-divider bg-white/35 px-3 py-2 text-sm"
          />
        </div>
        <textarea
          value={submission.note}
          onChange={(event) => setSubmission((current) => ({ ...current, note: event.target.value }))}
          maxLength={160}
          placeholder="Optional note"
          className="mt-3 min-h-20 w-full rounded-[14px] border soft-divider bg-white/35 px-3 py-2 text-sm"
        />
        <div className="mt-3 flex items-center justify-between gap-3">
          <span className="text-xs ink-muted">Core mechanics only</span>
          <button
            onClick={() => void submitLayout()}
            disabled={submitting}
            className="action-button action-primary px-4 py-2 text-sm disabled:opacity-60"
          >
            {submitting ? 'Submitting' : 'Submit'}
          </button>
        </div>
      </section>

      <section className="surface-panel rounded-[26px] p-4 sm:p-6">
        <h3 className="mb-4 text-xl font-bold">Curated Layouts</h3>
        {message && <p className="mb-3 text-sm ink-muted">{message}</p>}
        {loading ? (
          <p className="text-sm ink-muted">Loading layouts...</p>
        ) : layouts.length === 0 ? (
          <p className="text-sm ink-muted">No approved community layouts are available yet.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {layouts.map((layout) => (
              <div key={layout.layoutId} className="flex items-center justify-between gap-3 rounded-[18px] border soft-divider bg-white/35 p-3 sm:p-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">{layout.title}</span>
                    <span className="text-xs ink-muted">{layout.isFeatured ? 'Featured' : 'Approved'}</span>
                    <span className="text-xs ink-muted">by {layout.authorUsername}</span>
                  </div>
                  {layout.note && <div className="mt-1 text-sm ink-muted">{layout.note}</div>}
                  <div className="mt-1 text-xs ink-muted">
                    Seed {layout.seed} | {layout.targets.length} targets | {layout.hazards.length} hazards
                  </div>
                </div>
                <button
                  onClick={() => void handlePlayClick(layout.layoutId, layout.seed)}
                  className="action-button action-primary shrink-0 px-4 py-2 text-sm"
                >
                  Play
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
