import registry from './registry.json' with { type: 'json' };
import { normalizeIngredientName } from '../recipes/names';
import type { IngredientIdentity } from './model';
import { matchHash } from './hash';

export const ingredientRegistry = registry;
const names = new Map(
  registry.flatMap((item) =>
    [item.label, ...item.aliases].map((name) => [normalizeIngredientName(name), item] as const),
  ),
);
const entries = new Map(registry.map((item) => [item.id, item]));
const forms: [RegExp, IngredientIdentity['preparation']][] = [
  [/\b(uncooked|dry|dried)\b/, 'dry'],
  [
    /\b(cooked|precooked|pre cooked|microwaveable|microwavable|ready rice|ready to eat)\b/,
    'cooked',
  ],
  [/\bcanned\b/, 'canned'],
  [/\bfrozen\b/, 'frozen'],
  [/\braw\b/, 'raw'],
];
export function preparationFrom(text: string): IngredientIdentity['preparation'] | undefined {
  const normalized = text.toLowerCase().replaceAll('-', ' ');
  return forms.find(([pattern]) => pattern.test(normalized))?.[1];
}
function lookupName(name: string) {
  const normalized = normalizeIngredientName(name);
  const exact = names.get(normalized);
  if (exact) return exact;
  const simple = normalized
    .replace(/\s*\((?:unsalted|salted|organic)\)$/, '')
    .replace(/^(?:organic|unsalted|salted)\s+/, '')
    .replace(/^(?:canned|cooked|dry|dried|frozen|raw|microwaveable|microwavable)\s+/, '');
  return names.get(normalizeIngredientName(simple));
}
export function identifyIngredient(name: string): IngredientIdentity | undefined {
  const entry = lookupName(name);
  if (!entry) return undefined;
  return {
    id: entry.id,
    preparation: preparationFrom(name) ?? (entry.preparation as IngredientIdentity['preparation']),
    basis: 'as-sold',
  };
}
export function customIngredient(name: string): IngredientIdentity {
  return {
    id: `custom-${matchHash(normalizeIngredientName(name))}`,
    preparation: 'unknown',
    basis: 'as-sold',
  };
}
// Directional families: generic rice accepts brown rice, but brown rice does not accept white rice.
export function acceptsIdentity(required: string, available: string): boolean {
  const candidate = entries.get(available);
  return (
    required === available ||
    (candidate && 'parent' in candidate && candidate.parent === required) === true
  );
}
export const ingredientLabel = (id: string) => entries.get(id)?.label ?? 'Exact name';
