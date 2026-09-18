// Append-only mapping. These numbers identify authored story openings, never
// certify a generated picture as source text. Variants share the opening number.
export const storyCardNumbers = Object.freeze({
  'flowers-27': 1, 'poetry-37': 2, 'search-74': 3, 'manuscript-97': 4,
  'raid-105': 5, 'poems-82': 6, 'hope-90': 7, 'siege-91': 8,
});
export function storyCardNo(moment) {
  const number = storyCardNumbers[moment.nodeId];
  const opening = moment.branch === 'main' && moment.trigger === 'story' && moment.tick === 0
    && moment.worldId === `story:${moment.editionId}:${moment.nodeId}` && moment.snapshotId === `opening:${moment.nodeId}`;
  return number && opening ? `NO.${String(number).padStart(3, '0')}` : null;
}
export function assignCard(moment, owner, jobs) {
  const nodeNo = storyCardNo(moment);
  if (nodeNo) return {cardNo: nodeNo, cardKind: 'story-node'};
  const serial = [...jobs].filter(j => j.owner === owner).reduce((max, j) => Math.max(max, /^IF\.\d+$/.test(j.cardNo || '') ? Number(j.cardNo.slice(3)) : 0), 0) + 1;
  return {cardNo: `IF.${String(serial).padStart(4, '0')}`, cardKind: 'personal'};
}
export function migrateDreamJobs(jobs) {
  const changed = [], allocated = [...jobs];
  for (const job of [...jobs].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))) {
    let dirty = false;
    if (!job.styleVersion) {job.styleVersion = 'legacy'; dirty = true;}
    if (!job.cardNo) {Object.assign(job, assignCard(job.moment, job.owner, allocated)); dirty = true;}
    if (dirty) changed.push(job);
  }
  return changed;
}
