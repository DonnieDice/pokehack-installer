const { hasReviewedProject, projectSearchUrl, patchSearchUrl, permittedCoverUrl, statusLabel } = require('../catalogSafety');

const reviewed = {
  title: 'Example Hack', projectUrl: 'https://creator.example/hack',
  sourceType: 'creator', sourceUrl: 'https://creator.example/hack', verifiedAt: '2026-10-13',
};

test('legacy links are not treated as reviewed creator links', () => {
  const legacy = { title: 'Example Hack', projectUrl: 'https://roms.example/hack' };
  expect(hasReviewedProject(legacy)).toBe(false);
  expect(patchSearchUrl(legacy)).toBe(projectSearchUrl(legacy));
  const query = decodeURIComponent(projectSearchUrl(legacy));
  expect(query).not.toContain('roms.example');
  expect(query).not.toContain('ROM download');
});

test('reviewed creator patch searches are scoped, without promising search ranking', () => {
  expect(hasReviewedProject(reviewed)).toBe(true);
  expect(decodeURIComponent(patchSearchUrl(reviewed))).toContain('patch site:creator.example');
  expect(hasReviewedProject({ ...reviewed, projectUrl: 'javascript:alert(1)' })).toBe(false);
  expect(hasReviewedProject({ ...reviewed, projectUrl: 'https:///' })).toBe(false);
  expect(hasReviewedProject({ ...reviewed, projectUrl: 'https://creator.example@roms.example' })).toBe(false);
});

test('remote art requires affirmative permission evidence', () => {
  const hack = { coverUrl: 'https://images.example/cover.png' };
  expect(permittedCoverUrl(hack)).toBeNull();
  expect(permittedCoverUrl({ ...hack, coverPermission: { status: 'approved' } })).toBeNull();
  expect(permittedCoverUrl({ ...hack, coverPermission: { status: 'approved', evidenceUrl: 'https://creator.example/license' } })).toBe(hack.coverUrl);
});

test('unknown completion is not labeled active or complete', () => {
  expect(statusLabel({})).toBe('Not verified');
  expect(statusLabel({ completed: true })).toBe('Complete');
  expect(statusLabel({ completed: false })).toBe('In progress');
  expect(statusLabel({ status: 'demo' })).toBe('Demo');
  expect(statusLabel({ status: 'completed' })).toBe('Complete');
  expect(statusLabel({ status: 'unknown' })).toBe('Not verified');
});
