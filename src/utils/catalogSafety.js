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
  if (!hasReviewedProject(hack)) return projectSearchUrl(hack);
  const host = httpsHost(hack.projectUrl);
  return 'https://www.google.com/search?q=' + encodeURIComponent(`${hack.title} patch site:${host}`);
}

export function permittedCoverUrl(hack) {
  const permission = hack.coverPermission;
  return permission && permission.status === 'approved' && httpsHost(permission.evidenceUrl)
    && httpsHost(hack.coverUrl) ? hack.coverUrl : null;
}

export function statusLabel(hack) {
  const labels = { completed: 'Complete', beta: 'Beta', demo: 'Demo', 'in-development': 'In development', unmaintained: 'Unmaintained' };
  if (labels[hack.status]) return labels[hack.status];
  if (hack.completed === true) return 'Complete';
  if (hack.completed === false) return 'In progress';
  return 'Not verified';
}
