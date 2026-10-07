import type { Snapshot } from '../model';
import type { RecipeIngredient, Recipe } from '../recipes/model';
import { matchingLots } from '../recipes/availability';
import { lotMatch } from '../ingredient-matching/resolver';
import { stockIdentity } from '../ingredient-matching/classification';
import { convertRecipeAmount } from '../recipes/units';
import { profileAmount } from './profiles';

export function labelAmount(data: Snapshot, ingredient: RecipeIngredient, recipe?: Recipe) {
  const lots = matchingLots(data, ingredient, recipe);
  if (
    lots.some(
      (lot) =>
        lot.ingredientSize ||
        stockIdentity(
          data.foods.find((food) => food.id === lot.foodId)!,
          lot,
        )?.basis !== 'as-sold',
    )
  )
    return undefined;
  if (
    lots.some(
      (lot) =>
        lotMatch(data, ingredient, {
          food: data.foods.find((f) => f.id === lot.foodId)!,
          lot,
          recipe,
        }) !== 'compatible',
    )
  )
    return undefined;
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
