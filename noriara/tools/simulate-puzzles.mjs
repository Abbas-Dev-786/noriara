import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const rootDir = path.resolve(process.cwd());
const sourceDir = path.join(rootDir, 'src', 'shared');
const outDir = path.join(rootDir, '.tmp-simulation', 'shared');

await fs.rm(outDir, { recursive: true, force: true });
await compileDirectory(sourceDir);
await runSimulation();

async function compileDirectory(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await compileDirectory(fullPath);
      continue;
    }
    if (!entry.name.endsWith('.ts')) continue;

    const relativePath = path.relative(sourceDir, fullPath);
    const outputPath = path.join(outDir, relativePath).replace(/\.ts$/, '.js');
    const sourceText = await fs.readFile(fullPath, 'utf8');
    const transpiled = ts.transpileModule(sourceText, {
      compilerOptions: {
        module: ts.ModuleKind.ES2022,
        target: ts.ScriptTarget.ES2022,
      },
      fileName: fullPath,
    });

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, rewriteRelativeImports(transpiled.outputText), 'utf8');
  }
}

function rewriteRelativeImports(code) {
  return code.replace(
    /((?:import|export)\s+[^'"]*?from\s+|import\()(['"])(\.\.?\/[^'"]+)\2/g,
    (match, prefix, quote, specifier) => {
      if (specifier.endsWith('.js') || specifier.endsWith('.json')) {
        return `${prefix}${quote}${specifier}${quote}`;
      }
      return `${prefix}${quote}${specifier}.js${quote}`;
    }
  );
}

async function runSimulation() {
  const puzzleModulePath = path.join(outDir, 'puzzle.js');
  const { generatePuzzlesForSeed } = await import(pathToFileURL(puzzleModulePath).href);
  const reportDir = path.join(rootDir, '.tmp-simulation');
  const suspiciousSeedPath = path.join(reportDir, 'suspicious-seeds.json');

  console.log('Running Puzzle Generation Simulation...\n');
  await fs.mkdir(reportDir, { recursive: true });

  const diagnostics = {
    totalGenerated: 0,
    rejectionsByReason: {},
    fallbackCount: 0,
    archetypeDistribution: {},
    bandDistribution: {}
  };

  const bandTotals = {};
  const archetypeAcceptance = {};
  const rejectionHeavySeeds = [];

  const seedCount = 100; // Generate for 100 days/seeds
  const puzzlesPerSeed = 30;
  const suspiciousSeeds = [];

  for (let i = 0; i < seedCount; i++) {
    const seed = `sim-seed-${i}`;
    const rejectionBaseline = { ...diagnostics.rejectionsByReason };
    const puzzles = generatePuzzlesForSeed(seed, puzzlesPerSeed, diagnostics);

    for (const puzzle of puzzles) {
      const band = puzzle.meta?.difficultyBand ?? 'unknown';
      const archetype = puzzle.meta?.archetype ?? 'unknown';
      bandTotals[band] ??= { puzzleCount: 0, totalTargets: 0, totalHazards: 0 };
      bandTotals[band].puzzleCount += 1;
      bandTotals[band].totalTargets += puzzle.targets.length;
      bandTotals[band].totalHazards += puzzle.hazards.length;

      archetypeAcceptance[archetype] ??= 0;
      archetypeAcceptance[archetype] += 1;
    }

    const seedFallbacks = puzzles.filter(p => p.id.includes('-fallback')).length;
    const easyOrMediumViolations = puzzles.filter((p) => (
      (p.meta?.difficultyBand === 'easy' && (p.targets.length > 2 || p.hazards.length > 0)) ||
      (p.meta?.difficultyBand === 'medium' && (p.targets.length > 4 || p.hazards.length > 1))
    )).length;
    const seedRejections = {};
    let totalSeedRejections = 0;
    for (const [reason, count] of Object.entries(diagnostics.rejectionsByReason)) {
      const previous = rejectionBaseline[reason] ?? 0;
      const delta = count - previous;
      if (delta > 0) {
        seedRejections[reason] = delta;
        totalSeedRejections += delta;
      }
    }
    const dominantReasons = Object.entries(seedRejections)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([reason, count]) => ({ reason, count }));

    if (seedFallbacks > 0 || easyOrMediumViolations > 0) {
      suspiciousSeeds.push({
        seed,
        fallbackCount: seedFallbacks,
        easyOrMediumViolations,
      });
    }
    rejectionHeavySeeds.push({
      seed,
      totalRejections: totalSeedRejections,
      dominantReasons,
    });
  }

  console.log('--- Simulation Results ---');
  console.log(`Total Seeds Run: ${seedCount}`);
  console.log(`Total Puzzles Generated: ${diagnostics.totalGenerated}`);
  console.log(`Fallback Count: ${diagnostics.fallbackCount}`);

  const totalAccepted = diagnostics.totalGenerated;

  console.log('\nArchetype Distribution:');
  for (const [arch, count] of Object.entries(diagnostics.archetypeDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${arch}: ${count} (${((count / totalAccepted) * 100).toFixed(1)}%)`);
  }

  console.log('\nArchetype Accepted Counts:');
  for (const [arch, count] of Object.entries(archetypeAcceptance).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${arch}: ${count}`);
  }

  console.log('\nDifficulty Band Distribution:');
  for (const [band, count] of Object.entries(diagnostics.bandDistribution).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${band}: ${count} (${((count / totalAccepted) * 100).toFixed(1)}%)`);
  }

  console.log('\nAverage Shapes Per Band:');
  for (const [band, totals] of Object.entries(bandTotals).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(
      `  ${band}: avg targets ${(totals.totalTargets / totals.puzzleCount).toFixed(2)}, avg hazards ${(totals.totalHazards / totals.puzzleCount).toFixed(2)}`
    );
  }

  console.log('\nRejections By Reason:');
  for (const [reason, count] of Object.entries(diagnostics.rejectionsByReason).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${reason}: ${count}`);
  }

  if (suspiciousSeeds.length > 0) {
    console.log('\nSuspicious Seeds (had fallbacks):');
    for (const s of suspiciousSeeds.slice(0, 10)) {
      console.log(`  ${s.seed}: ${s.fallbackCount} fallbacks`);
    }
    if (suspiciousSeeds.length > 10) {
      console.log(`  ...and ${suspiciousSeeds.length - 10} more`);
    }
  } else {
    console.log('\nSuspicious Seeds: None (0 fallbacks!)');
  }

  console.log('\nMost Rejection-Heavy Seeds:');
  for (const seed of [...rejectionHeavySeeds].sort((a, b) => b.totalRejections - a.totalRejections).slice(0, 10)) {
    const dominant = seed.dominantReasons.map((entry) => `${entry.reason}:${entry.count}`).join(', ');
    console.log(`  ${seed.seed}: ${seed.totalRejections} rejections (${dominant})`);
  }

  await fs.writeFile(
    suspiciousSeedPath,
    JSON.stringify(
      {
        generatedAt: new Date().toISOString(),
        seedCount,
        suspiciousSeeds,
        rejectionHeavySeeds: [...rejectionHeavySeeds].sort((a, b) => b.totalRejections - a.totalRejections).slice(0, 20),
      },
      null,
      2
    ),
    'utf8'
  );
  console.log(`\nSuspicious seed report written to ${path.relative(rootDir, suspiciousSeedPath)}`);

  console.log('\nSimulation Complete.');
}
