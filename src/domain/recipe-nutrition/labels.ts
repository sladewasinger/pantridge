import type { Snapshot } from '../model';
import type { RecipeIngredient } from '../recipes/model';
import { normalizeIngredientName } from '../recipes/names';
import { convertRecipeAmount } from '../recipes/units';
import { isSupply } from '../supplies';
import { profileAmount } from './profiles';

export function labelAmount(data: Snapshot, ingredient: RecipeIngredient) {
  const ids = new Set(
    data.foods
      .filter(
        (food) =>
          !isSupply(food) &&
          normalizeIngredientName(food.name) === normalizeIngredientName(ingredient.name),
      )
      .map((food) => food.id),
  );
  const lots = data.stock.filter((lot) => ids.has(lot.foodId) && lot.quantity > 0);
  const labels = lots
    .map((lot) => lot.product?.nutrition)
    .filter((label) => label?.basis && Object.keys(label.per100).length);
  const label = labels[0];
  // Different brands/unknown bases cannot establish one authoritative label for this recipe.
  if (
    !label?.basis ||
    labels.length !== lots.length ||
    labels.some((item) => JSON.stringify(item) !== JSON.stringify(label))
  )
    return undefined;
  const direct = convertRecipeAmount(ingredient.quantity, ingredient.unit, label.basis);
  const portion =
    direct === undefined && label.basis === 'g' ? profileAmount(ingredient) : undefined;
  const amount = direct ?? portion?.grams;
  if (amount === undefined) return undefined;
  return {
    amount,
    per100: { ...label.per100, carbohydrate: label.per100.carbohydrates },
    assumption:
      `Saved package label per 100 ${label.basis}; assumes the same product and preparation.${portion ? ` Portion: ${portion.assumption}` : ''}`.slice(
        0,
        240,
      ),
  };
}
