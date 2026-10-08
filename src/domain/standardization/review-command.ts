import type { Snapshot } from '../model';
import type { Command } from '../commands';
import { recognitionReviews } from './review';

export function reviewClassification(
  data: Snapshot,
  command: Extract<Command, { type: 'classification.review' }>,
): Snapshot {
  const review = recognitionReviews(data).find((item) => item.key === command.key);
  if (!review || review.signature !== command.expected)
    throw new Error('Food recognition changed. Review this item again.');
  const ingredient = command.ingredient;
  const foods = data.foods.map((food) =>
    `food:${food.id}` === command.key ? { ...food, ingredient } : food,
  );
  return {
    ...data,
    foods,
    stock: data.stock.map((lot) => {
      const direct = `stock:${lot.id}` === command.key;
      const inherited = `food:${lot.foodId}` === command.key && !lot.ingredient;
      return direct || inherited
        ? {
            ...lot,
            ...(direct ? { ingredient } : {}),
            ingredientSize: undefined,
            ingredientSizeBasis: undefined,
          }
        : lot;
    }),
    ...(data.recipes
      ? {
          recipes: data.recipes.map((recipe) => ({
            ...recipe,
            ingredients: recipe.ingredients.map((item) =>
              `recipe:${recipe.id}:${item.id}` === command.key ? { ...item, ingredient } : item,
            ),
          })),
        }
      : {}),
  };
}
