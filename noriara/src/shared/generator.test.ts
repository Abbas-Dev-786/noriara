import { generatePuzzlesForSeed } from './puzzle';

function assertEqual(actual: unknown, expected: unknown, message?: string) {
  if (actual !== expected) {
    throw new Error(message ?? `Assertion failed: expected ${expected}, got ${actual}`);
  }
}

function assertDeepEqual(actual: unknown, expected: unknown, message?: string) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message ?? `Assertion failed: objects are not deeply equal`);
  }
}

async function runGeneratorTests() {
  console.log('Running generator determinism tests...');

  // Generate 10 puzzles for a specific seed
  const seed = 'deterministic-test-seed-v2';
  const puzzlesRun1 = generatePuzzlesForSeed(seed, 10);
  const puzzlesRun2 = generatePuzzlesForSeed(seed, 10);

  // 1. Same seed should produce the exact same number of puzzles
  assertEqual(puzzlesRun1.length, 10);
  assertEqual(puzzlesRun2.length, 10);

  // 2. Output should be perfectly deterministic
  assertDeepEqual(puzzlesRun1, puzzlesRun2, 'Puzzle generator output is not deterministic!');

  // 3. First puzzle is tutorial, next two are easy
  assertEqual(puzzlesRun1[0]?.meta?.difficultyBand, 'tutorial');
  assertEqual(puzzlesRun1[1]?.meta?.difficultyBand, 'easy');
  assertEqual(puzzlesRun1[2]?.meta?.difficultyBand, 'easy');
  
  // 4. Verify version metadata
  assertEqual(puzzlesRun1[0]?.meta?.generatorVersion, 2, 'Generator version mismatch');

  console.log('generator determinism tests passed');
}

await runGeneratorTests();
