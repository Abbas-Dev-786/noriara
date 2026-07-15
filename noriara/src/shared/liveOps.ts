import type { EventConfig } from './api';

const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const EVENT_ID_PATTERN = /^[a-z0-9][a-z0-9-]{2,39}$/;

export type EventConfigInput = {
  eventId: unknown;
  label: unknown;
  startDate: unknown;
  endDate: unknown;
  seed: unknown;
  timerSeconds: unknown;
  puzzleCount: unknown;
};

export function isValidIsoDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  return Number.isFinite(timestamp) && new Date(timestamp).toISOString().slice(0, 10) === value;
}

export function normalizeEventConfig(input: EventConfigInput): EventConfig {
  const eventId = requireString(input.eventId, 'Event ID').toLowerCase();
  const label = requireString(input.label, 'Label');
  const startDate = requireString(input.startDate, 'Start date');
  const endDate = requireString(input.endDate, 'End date');
  const seed = requireString(input.seed, 'Seed');
  const timerSeconds = requireInteger(input.timerSeconds, 'Timer');
  const puzzleCount = requireInteger(input.puzzleCount, 'Puzzle count');

  if (!EVENT_ID_PATTERN.test(eventId)) {
    throw new Error('Event ID must be 3-40 lowercase letters, numbers, or hyphens.');
  }
  if (label.length > 60) throw new Error('Label must be 60 characters or fewer.');
  if (!isValidIsoDate(startDate) || !isValidIsoDate(endDate)) {
    throw new Error('Start and end dates must use YYYY-MM-DD.');
  }
  if (endDate < startDate) throw new Error('End date cannot be before start date.');
  if (seed.length > 120) throw new Error('Seed must be 120 characters or fewer.');
  if (timerSeconds < 10 || timerSeconds > 180) {
    throw new Error('Timer must be between 10 and 180 seconds.');
  }
  if (puzzleCount < 1 || puzzleCount > 100) {
    throw new Error('Puzzle count must be between 1 and 100.');
  }

  return {
    eventId,
    label,
    startDate,
    endDate,
    seed,
    timerMs: timerSeconds * 1000,
    puzzleCount,
    allowedMechanics: ['core'],
  };
}

function requireString(value: unknown, label: string): string {
  if (typeof value !== 'string' || !value.trim()) throw new Error(`${label} is required.`);
  return value.trim();
}

function requireInteger(value: unknown, label: string): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isInteger(number)) throw new Error(`${label} must be a whole number.`);
  return number;
}
