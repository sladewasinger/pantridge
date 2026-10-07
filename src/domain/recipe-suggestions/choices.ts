import type { Snapshot } from '../model';
import type { Recipe } from '../recipes/model';
import { normalizeIngredientName } from '../recipes/names';
import { suggestionFoods } from './inventory';

export function ingredientChoices(data: Snapshot, recipe: Recipe, today: string) {
  const foods = suggestionFoods(data, today);
  return recipe.ingredients.flatMap((ingredient) => {
    const name = normalizeIngredientName(ingredient.name);
    const options = [
      ...new Set(
        foods
          .filter((food) => normalizeIngredientName(food.name) === name)
          .map((food) => food.food.name),
      ),
    ];
    if (!options.length || (options.length === 1 && normalizeIngredientName(options[0]!) === name))
      return [];
    return [{ ingredient, options }];
  });
}

export function chooseIngredients(
  data: Snapshot,
  recipe: Recipe,
  selections: Record<string, string>,
  today: string,
): Recipe {
  const choices = ingredientChoices(data, recipe, today);
  for (const choice of choices) {
    if (!choice.options.includes(selections[choice.ingredient.id] ?? ''))
      throw new Error(`Choose a stocked food for ${choice.ingredient.name}.`);
  }
  return {
    ...recipe,
    ingredients: recipe.ingredients.map((ingredient) => ({
      ...ingredient,
      name: choices.some((choice) => choice.ingredient.id === ingredient.id)
        ? selections[ingredient.id]!
        : ingredient.name,
    })),
  };
}
