import { useState, useEffect } from 'react';
import type { ArchiveListResponse, ArchiveDateResponse } from '../shared/api';

interface ArchiveViewProps {
  onOpenReplay: (username: string, date: string) => void;
  onBack: () => void;
}

export const ArchiveView = ({ onOpenReplay, onBack }: ArchiveViewProps) => {
  const [dates, setDates] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [archiveData, setArchiveData] = useState<ArchiveDateResponse | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch('/api/archive')
      .then((res) => res.json())
      .then((data: ArchiveListResponse) => {
        if (data.status === 'ok') {
          setDates(data.dates);
        }
      })
      .catch((err) => console.error('Failed to load archive dates', err));
  }, []);

  const loadArchive = async (date: string) => {
    setLoading(true);
    setSelectedDate(date);
    try {
      const res = await fetch(`/api/archive/${date}`);
      const data: ArchiveDateResponse = await res.json();
      if (data.status === 'ok') {
        setArchiveData(data);
      }
    } catch (err) {
      console.error('Failed to load archive for date', date, err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-hidden text-[rgb(var(--ink-rgb))]">
      <div className="flex items-center justify-between border-b border-[rgba(var(--ink-rgb),0.1)] p-4">
        <h2 className="text-xl font-bold">Archives</h2>
        <button onClick={onBack} className="action-button action-secondary px-3 py-1">
          Back
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar: Date List */}
        <div className="w-1/3 overflow-y-auto border-r border-[rgba(var(--ink-rgb),0.1)] p-2">
          {dates.length === 0 && <p className="p-2 text-sm opacity-60">No archives yet.</p>}
          {dates.map((date) => (
            <button
              key={date}
              onClick={() => loadArchive(date)}
              className={`w-full rounded p-3 text-left font-mono text-sm transition-colors ${
                selectedDate === date
                  ? 'bg-[rgb(var(--primary-rgb))] text-white'
                  : 'hover:bg-[rgba(var(--ink-rgb),0.05)]'
              }`}
            >
              {date}
            </button>
          ))}
        </div>

        {/* Main Content: Archive Details */}
        <div className="flex-1 overflow-y-auto p-4">
          {!selectedDate ? (
            <div className="flex h-full items-center justify-center opacity-50">
              Select a date to view past leaderboards.
            </div>
          ) : loading ? (
            <div className="flex h-full items-center justify-center">Loading...</div>
          ) : archiveData ? (
            <div className="space-y-6">
              {archiveData.summary && (
                <div className="rounded-lg bg-[rgba(var(--ink-rgb),0.05)] p-4">
                  <h3 className="mb-2 font-bold opacity-80">Daily Summary</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>Seed: <span className="font-mono">{archiveData.summary.seed}</span></div>
                    <div>Participants: {archiveData.summary.totalRuns}</div>
                    <div>Top Score: {archiveData.summary.winnerScore}</div>
                    <div>Winner: {archiveData.summary.winnerUsername ?? 'Unknown'}</div>
                  </div>
                </div>
              )}
              
              <div>
                <h3 className="mb-4 font-bold opacity-80">Leaderboard</h3>
                {archiveData.leaderboard.length === 0 ? (
                  <p className="opacity-60">No entries for this date.</p>
                ) : (
                  <div className="space-y-2">
                    {archiveData.leaderboard.map((entry) => (
                      <div
                        key={entry.username}
                        className="flex items-center justify-between rounded bg-[rgba(var(--ink-rgb),0.03)] p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold opacity-50">#{entry.rank}</span>
                          <span className="font-bold">{entry.username}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-bold">{entry.score} pts</div>
                            <div className="text-xs opacity-70">{entry.puzzlesSolved} puzzles</div>
                          </div>
                          {entry.hasReplay && (
                            <button
                              onClick={() => onOpenReplay(entry.username, selectedDate)}
                              className="rounded border border-[rgba(var(--ink-rgb),0.2)] px-2 py-1 text-xs hover:bg-[rgba(var(--ink-rgb),0.1)]"
                            >
                              Replay
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex h-full items-center justify-center opacity-50">
              Failed to load archive data.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
