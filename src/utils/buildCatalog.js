const PLATFORM_ACCENTS = { GB: '#FFD93D', GBC: '#9ACD32', GBA: '#7df2ff', NDS: '#b428a0', SNES: '#a78bfa' };

// Source records can replace a historical entry, but cannot silently duplicate
// it. Unknown metadata stays unknown rather than acquiring estimated defaults.
export function buildCatalog(legacy, reviewed) {
  const catalog = new Map(legacy.map((entry) => {
    const { rating, hours, difficulty, completed, ...hack } = entry;
    return [hack.id, {
      ...hack,
      sourceType: 'unreviewed',
      tags: hack.tags.filter((tag) => !['Completed', 'Updated Regularly'].includes(tag)),
    }];
  }));
  const seen = new Set();
  for (const record of reviewed) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.id)) throw new Error('Invalid catalog id');
    if (seen.has(record.id)) throw new Error(`Duplicate source record: ${record.id}`);
    seen.add(record.id);
    if (!PLATFORM_ACCENTS[record.platform]) throw new Error(`Unknown platform: ${record.platform}`);
    const accentColor = PLATFORM_ACCENTS[record.platform];
    const hack = {
      ...record,
      subtitle: record.subtitle || 'Creator project',
      tags: record.tags || [],
      accentColor,
      gradient: ['#050810', accentColor],
      sourceType: 'creator',
      verifiedAt: record.verifiedAt || record.verificationDate,
    };
    if (!hasReviewedProject(hack) || !/^\d{4}-\d{2}-\d{2}$/.test(hack.verifiedAt)
      || !hack.title || !hack.description) throw new Error(`Missing source evidence: ${record.id}`);
    catalog.set(record.id, hack);
  }
  return [...catalog.values()];
}
import { hasReviewedProject } from './catalogSafety';
