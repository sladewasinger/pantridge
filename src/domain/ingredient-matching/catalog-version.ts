import registry from './registry.json' with { type: 'json' };

export const catalogRevision = 2;
const revisions = new Map(
  registry.map((item) => [item.id, 'introduced' in item ? item.introduced : 1]),
);
export function knownInCatalog(id: string, revision: number) {
  return /^custom-[a-f0-9]{64}$/.test(id) || (revisions.get(id) ?? Infinity) <= revision;
}
