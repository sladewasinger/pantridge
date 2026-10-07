import type { Snapshot } from '../model';
import { matchingLots, type RecipeAvailability } from './availability';
import { requirementKey } from '../ingredient-matching/context';

export interface RecipeCoverage {
  required: number;
  onHand: number;
  possible: number;
  section: 'on-hand' | 'partial' | 'unmatched';
}
export function recipeCoverage(data: Snapshot, match: RecipeAvailability): RecipeCoverage {
  const required = [
    ...new Map(
      match.ingredients
        .filter((item) => !item.ingredient.optional)
        .map((item) => [requirementKey(match.recipe, item.ingredient), item.ingredient]),
    ).values(),
  ];
  const onHand = required.filter(
    (item) => matchingLots(data, item, match.recipe).length > 0,
  ).length;
  const possible = 0;
  const section =
    onHand + possible === 0
      ? 'unmatched'
      : match.status !== 'missing' && possible === 0 && !match.recipe.untrackedIngredients?.length
        ? 'on-hand'
        : 'partial';
  return { required: required.length, onHand, possible, section };
}
export type RecipeBrowseMatch = RecipeAvailability & { coverage: RecipeCoverage };
export function coverageOrder(left: RecipeBrowseMatch, right: RecipeBrowseMatch) {
  const score = (value: RecipeCoverage) =>
    value.required ? (value.onHand + value.possible * 0.5) / value.required : 0;
  return (
    Number(left.status !== 'confirmed') - Number(right.status !== 'confirmed') ||
    score(right.coverage) - score(left.coverage) ||
    right.coverage.onHand - left.coverage.onHand
  );
}
export function sectionOrder(left: RecipeBrowseMatch, right: RecipeBrowseMatch) {
  const rank = { 'on-hand': 0, partial: 1, unmatched: 2 };
  return rank[left.coverage.section] - rank[right.coverage.section];
}
