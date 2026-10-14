// Review flags are editorial evidence, not a determination of legality.
function httpsHost(url) {
  const match = /^https:\/\/([a-z0-9.-]+)(?::\d+)?(?:[/?#]|$)/i.exec(url || '');
  return match && match[1].includes('.') ? match[1] : null;
}

export function hasReviewedProject(hack) {
  return hack.sourceType === 'creator' && Boolean(httpsHost(hack.sourceUrl) && hack.verifiedAt)
    && Boolean(httpsHost(hack.projectUrl));
}

export function projectSearchUrl(hack) {
  return 'https://www.google.com/search?q=' + encodeURIComponent(`${hack.title} creator official project patch`);
}

export function patchSearchUrl(hack) {
  // Google search scoped to the project page's own host, so the top hit is the
  // project page and its download links. Falls back to a broad query.
  const host = httpsHost(hack.projectUrl);
  const q = host ? `${hack.title} download site:${host}` : `${hack.title} ROM hack download`;
  return 'https://www.google.com/search?q=' + encodeURIComponent(q);
}

export function permittedCoverUrl(hack) {
  // Art is shown by default from its source page; rights review and the
  // coverPermission ledger remain pre-publication gates (see
  // docs/CATALOG_CONTENT_POLICY.md), and 'revoked' hides art immediately.
  if (hack.coverPermission && hack.coverPermission.status === 'revoked') return null;
  return httpsHost(hack.coverUrl) ? hack.coverUrl : null;
}

export function statusLabel(hack) {
  const labels = { completed: 'Complete', beta: 'Beta', demo: 'Demo', 'in-development': 'In development', unmaintained: 'Unmaintained' };
  if (labels[hack.status]) return labels[hack.status];
  if (hack.completed === true) return 'Complete';
  if (hack.completed === false) return 'In progress';
  return '';
}
