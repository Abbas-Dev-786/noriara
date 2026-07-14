import {
  humanizeCommunityIssues,
  isCommunityLayoutPlayable,
  normalizeCommunitySubmission,
  validateCommunitySubmission,
} from './communityLayouts';

run();

function run() {
  testAcceptsCoreSubmission();
  testRejectsUnsupportedMechanics();
  testRejectsLongTitle();
  testNormalizeSubmission();
  testPlayableStatuses();
  console.log('communityLayouts tests passed');
}

function testAcceptsCoreSubmission() {
  const result = validateCommunitySubmission({
    title: 'Arc Sweep',
    note: 'A readable opener.',
    seed: 'community-seed-1',
    mechanics: ['core'],
  });

  assert(result.accepted === true, 'expected valid community submission to be accepted');
}

function testRejectsUnsupportedMechanics() {
  const result = validateCommunitySubmission({
    title: 'Wind Test',
    note: '',
    seed: 'community-seed-2',
    mechanics: ['windField'],
  });

  assert(result.accepted === false, 'expected unsupported mechanics to be rejected');
  if (!result.accepted) {
    assert(
      result.reason === 'Only core mechanics are currently allowed.',
      'expected unsupported mechanics reason'
    );
  }
}

function testRejectsLongTitle() {
  const result = validateCommunitySubmission({
    title: 'x'.repeat(49),
    note: '',
    seed: 'community-seed-3',
    mechanics: ['core'],
  });

  assert(result.accepted === false, 'expected long title to be rejected');
  if (!result.accepted) {
    assert(
      result.reason === 'Title must be 48 characters or fewer.',
      'expected long title rejection'
    );
    assert(
      humanizeCommunityIssues(result.diagnostics.issues) === 'Title must be 48 characters or fewer.',
      'expected humanized issue to match'
    );
  }
}

function testNormalizeSubmission() {
  const normalized = normalizeCommunitySubmission({
    title: '  Arc Sweep  ',
    note: '  note  ',
    seed: ' seed ',
    mechanics: ['core', 'core'],
  });

  assert(normalized.title === 'Arc Sweep', 'expected title to be trimmed');
  assert(normalized.note === 'note', 'expected note to be trimmed');
  assert(normalized.seed === 'seed', 'expected seed to be trimmed');
  assert(normalized.mechanics.length === 1, 'expected duplicate mechanics to be removed');
}

function testPlayableStatuses() {
  assert(
    isCommunityLayoutPlayable({
      layoutId: '1',
      authorUsername: 'user',
      title: 'Playable',
      note: '',
      seed: 'seed',
      mechanics: ['core'],
      targets: [],
      hazards: [],
      generatorVersion: 2,
      upvotes: 0,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      status: 'approved',
      rejectionReason: null,
      validatorDiagnostics: {
        issues: [],
        previewTargetCount: 1,
        previewHazardCount: 0,
        previewArchetype: 'open-sweep',
        generatorVersion: 2,
      },
      featuredAt: null,
      retiredAt: null,
      isFeatured: false,
    }),
    'expected approved layout to be playable'
  );
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}
