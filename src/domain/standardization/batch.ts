import { batchSize } from './model';
import type { ClassificationTarget } from './targets';

export const classificationRequest = (targets: ClassificationTarget[]) => ({
  kind: 'standardization' as const,
  mode: 'resolve' as const,
  items: targets.map(({ key, evidence, barcode }) => ({ key, evidence, barcode })),
});

// Keep rich metadata intact and leave the remainder queued rather than exceed the API body cap.
export function classificationBatch(targets: ClassificationTarget[]): ClassificationTarget[] {
  const selected: ClassificationTarget[] = [];
  for (const target of targets.slice(0, batchSize)) {
    const next = [...selected, target];
    if (new TextEncoder().encode(JSON.stringify(classificationRequest(next))).length > 16_384)
      break;
    selected.push(target);
  }
  return selected;
}
