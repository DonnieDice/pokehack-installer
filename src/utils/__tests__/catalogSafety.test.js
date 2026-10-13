const { hasReviewedProject, projectSearchUrl, patchSearchUrl, permittedCoverUrl, statusLabel } = require('../catalogSafety');

const reviewed = {
  title: 'Example Hack', projectUrl: 'https://creator.example/hack',
  sourceType: 'creator', sourceUrl: 'https://creator.example/hack', verifiedAt: '2026-10-13',
};

test('legacy links are not treated as reviewed creator links', () => {
  const legacy = { title: 'Example Hack', projectUrl: 'https://roms.example/hack' };
  expect(hasReviewedProject(legacy)).toBe(false);
  const query = decodeURIComponent(projectSearchUrl(legacy));
  expect(query).toContain('creator official project patch');
});

test('reviewed creator patch searches are scoped, without promising search ranking', () => {
  expect(hasReviewedProject(reviewed)).toBe(true);
  expect(decodeURIComponent(patchSearchUrl(reviewed))).toContain('download site:creator.example');
  expect(hasReviewedProject({ ...reviewed, projectUrl: 'javascript:alert(1)' })).toBe(false);
  expect(hasReviewedProject({ ...reviewed, projectUrl: 'https:///' })).toBe(false);
  expect(hasReviewedProject({ ...reviewed, projectUrl: 'https://creator.example@roms.example' })).toBe(false);
});

test('download searches are scoped to the project page host', () => {
  expect(decodeURIComponent(patchSearchUrl(reviewed))).toContain('download site:creator.example');
  const legacy = { title: 'Example Hack', projectUrl: 'https://www.pokeharbor.com/x' };
  expect(decodeURIComponent(patchSearchUrl(legacy))).toContain('download site:www.pokeharbor.com');
  const noHost = { title: 'Example Hack' };
  expect(decodeURIComponent(patchSearchUrl(noHost))).toContain('ROM hack download');
});

test('remote art shows from its source; a revocation hides it immediately', () => {
  const hack = { coverUrl: 'https://images.example/cover.png' };
  expect(permittedCoverUrl(hack)).toBe(hack.coverUrl);
  expect(permittedCoverUrl({ ...hack, coverPermission: { status: 'approved', evidenceUrl: 'https://creator.example/license' } })).toBe(hack.coverUrl);
  expect(permittedCoverUrl({ ...hack, coverPermission: { status: 'revoked' } })).toBeNull();
  expect(permittedCoverUrl({ coverUrl: 'http://insecure.example/c.png' })).toBeNull();
});

test('unknown completion is not labeled active or complete', () => {
  expect(statusLabel({})).toBe('');
  expect(statusLabel({ completed: true })).toBe('Complete');
  expect(statusLabel({ completed: false })).toBe('In progress');
  expect(statusLabel({ status: 'demo' })).toBe('Demo');
  expect(statusLabel({ status: 'completed' })).toBe('Complete');
  expect(statusLabel({ status: 'unknown' })).toBe('');
});
