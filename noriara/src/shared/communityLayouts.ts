import type { CommunityLayout, CommunityLayoutDiagnostics, CommunitySubmitRequest } from './api';
import { generatePuzzlesForSeed } from './puzzle';

const MAX_TITLE_LENGTH = 48;
const MAX_NOTE_LENGTH = 160;
const MAX_SEED_LENGTH = 32;
const ALLOWED_MECHANICS = new Set(['core']);

export type CommunityLayoutValidationResult =
  | {
      accepted: true;
      diagnostics: CommunityLayoutDiagnostics;
      preview: Pick<CommunityLayout, 'targets' | 'hazards' | 'generatorVersion'>;
    }
  | {
      accepted: false;
      reason: string;
      diagnostics: CommunityLayoutDiagnostics;
    };

export function validateCommunitySubmission(input: CommunitySubmitRequest): CommunityLayoutValidationResult {
  const issues: string[] = [];
  const title = input.title.trim();
  const note = input.note.trim();
  const seed = input.seed.trim();
  const mechanics = Array.isArray(input.mechanics) && input.mechanics.length > 0 ? input.mechanics : ['core'];

  if (!title) issues.push('title_required');
  if (title.length > MAX_TITLE_LENGTH) issues.push('title_too_long');
  if (note.length > MAX_NOTE_LENGTH) issues.push('note_too_long');
  if (!seed || seed.length > MAX_SEED_LENGTH) issues.push('seed_invalid');
  if (mechanics.some((mechanic) => !ALLOWED_MECHANICS.has(mechanic))) {
    issues.push('mechanics_not_supported');
  }
  if (containsBlockedText(title) || containsBlockedText(note)) {
    issues.push('content_flagged_for_review');
  }

  const preview = seed ? generatePuzzlesForSeed(seed, 1)[0] : null;
  const diagnostics: CommunityLayoutDiagnostics = {
    issues,
    previewTargetCount: preview?.targets.length ?? 0,
    previewHazardCount: preview?.hazards.length ?? 0,
    previewArchetype: preview?.meta?.archetype ?? null,
    generatorVersion: preview?.meta?.generatorVersion ?? 2,
  };

  if (!preview) {
    return {
      accepted: false,
      reason: 'Preview generation failed.',
      diagnostics,
    };
  }

  if (issues.length > 0) {
    return {
      accepted: false,
      reason: humanizeCommunityIssues(issues),
      diagnostics,
    };
  }

  return {
    accepted: true,
    diagnostics,
    preview: {
      targets: preview.targets,
      hazards: preview.hazards,
      generatorVersion: preview.meta?.generatorVersion ?? 2,
    },
  };
}

export function normalizeCommunitySubmission(input: CommunitySubmitRequest): CommunitySubmitRequest {
  return {
    title: input.title.trim(),
    note: input.note.trim(),
    seed: input.seed.trim(),
    mechanics: Array.isArray(input.mechanics) && input.mechanics.length > 0 ? [...new Set(input.mechanics)] : ['core'],
  };
}

export function isCommunityLayoutPlayable(layout: CommunityLayout): boolean {
  return layout.status === 'approved' || layout.status === 'featured';
}

export function humanizeCommunityIssues(issues: string[]): string {
  if (issues.includes('title_required')) return 'Title is required.';
  if (issues.includes('title_too_long')) return `Title must be ${MAX_TITLE_LENGTH} characters or fewer.`;
  if (issues.includes('note_too_long')) return `Note must be ${MAX_NOTE_LENGTH} characters or fewer.`;
  if (issues.includes('seed_invalid')) return `Seed must be ${MAX_SEED_LENGTH} characters or fewer.`;
  if (issues.includes('mechanics_not_supported')) return 'Only core mechanics are currently allowed.';
  if (issues.includes('content_flagged_for_review')) return 'Submission was flagged for moderator review.';
  return 'Community submission is invalid.';
}

function containsBlockedText(text: string): boolean {
  const normalized = text.toLowerCase();
  return ['http://', 'https://', 'discord.gg', 'slur'].some((blocked) => normalized.includes(blocked));
}
