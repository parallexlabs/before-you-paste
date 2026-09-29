/**
 * Group identical findings for display in the review list.
 * @param {import('./types.js').Finding[]} findings
 * @returns {Array<{ representative: import('./types.js').Finding, members: import('./types.js').Finding[], count: number, layer: string }>}
 */
export function groupFindingsForDisplay(findings) {
  const groups = [];
  const indexByKey = new Map();

  for (const f of findings) {
    if (f.layer === 'mosaic' || f.layer === 'context') {
      groups.push({ representative: f, members: [f], count: 1, layer: f.layer });
      continue;
    }

    const key = f.entityKey || `${f.type}:${f.text.trim().toLowerCase()}`;
    if (indexByKey.has(key)) {
      const idx = indexByKey.get(key);
      const group = groups[idx];
      group.members.push(f);
      group.count += 1;
    } else {
      indexByKey.set(key, groups.length);
      groups.push({
        representative: f,
        members: [f],
        count: 1,
        layer: f.layer
      });
    }
  }

  return groups;
}
