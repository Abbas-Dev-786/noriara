import { isValidIsoDate, normalizeEventConfig } from './liveOps';

{
  const config = normalizeEventConfig({
    eventId: ' Summer-Sprint ',
    label: ' Summer Sprint ',
    startDate: '2026-07-15',
    endDate: '2026-07-21',
    seed: ' event-seed ',
    timerSeconds: 45,
    puzzleCount: 40,
  });

  assert(config.eventId === 'summer-sprint', 'expected event ID normalization');
  assert(config.timerMs === 45_000, 'expected seconds to be converted to milliseconds');
  assert(config.allowedMechanics.length === 1 && config.allowedMechanics[0] === 'core', 'expected core mechanics');
}

assert(isValidIsoDate('2024-02-29'), 'expected leap date to be valid');
assert(!isValidIsoDate('2026-02-29'), 'expected impossible date to be invalid');
assert(!isValidIsoDate('2026-13-01'), 'expected impossible month to be invalid');
assertThrows(
  () =>
    normalizeEventConfig({
      eventId: 'event',
      label: 'Event',
      startDate: '2026-07-20',
      endDate: '2026-07-19',
      seed: 'seed',
      timerSeconds: 30,
      puzzleCount: 30,
    }),
  'expected reversed date range to be rejected'
);

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function assertThrows(callback: () => void, message: string) {
  try {
    callback();
  } catch {
    return;
  }
  throw new Error(message);
}
