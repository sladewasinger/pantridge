import type { Snapshot } from '../model';
import type { Recipe } from '../recipes/model';
import type { RecipePreferences } from '../recipe-preferences/model';
import { excludedIngredient } from '../recipe-preferences/fit';
import { suggestionFoods } from '../recipe-suggestions/inventory';
import { normalizeIngredientName } from '../recipes/names';
import { substitutionOptions } from './substitutions';
import type { RecipeVariation } from './model';

export function recipeVariations(
  data: Snapshot,
  recipe: Recipe,
  preferences: RecipePreferences,
  today: string,
) {
  const foods = suggestionFoods(data, today)
    .map((item) => item.food)
    .filter((food) => !excludedIngredient(food.name, preferences));
  if (recipe.steps.length >= 30) return { substitutions: [], pairings: [] };
  const additions: RecipeVariation[] = [
    {
      id: 'bright',
      label: 'Brighter',
      why: 'Lemon adds a fresh, acidic finish.',
      preparation: 'Stir the lemon juice in just before serving.',
      ingredient: { name: 'Lemon juice', quantity: 0.5 * recipe.servings, unit: 'tbsp' },
      minutes: 0,
      stocked: false,
    },
    {
      id: 'spicy',
      label: 'Spicier',
      why: 'A little cayenne brings heat without changing the main ingredients.',
      preparation: 'Stir in the cayenne during cooking; taste before adding more.',
      ingredient: { name: 'Cayenne pepper', quantity: recipe.servings / 16, unit: 'tsp' },
      minutes: 0,
      stocked: false,
    },
    {
      id: 'crunch',
      label: 'More crunch',
      why: 'Pumpkin seed kernels add a nutty, crisp finish.',
      preparation:
        'Toast shelled pumpkin seeds in a dry pan for 2–3 minutes, then sprinkle over the cooked meal.',
      ingredient: { name: 'Pumpkin seeds', quantity: recipe.servings, unit: 'tbsp' },
      minutes: 3,
      stocked: false,
    },
    {
      id: 'protein',
      label: 'Extra protein',
      why: 'Ready-to-eat chickpeas make a savory meal more substantial.',
      preparation: 'Drain canned chickpeas and warm them with the cooked meal before serving.',
      ingredient: {
        name: 'Canned chickpeas',
        quantity: 50 * recipe.servings,
        unit: 'g',
        note: 'drained, ready to eat',
      },
      minutes: 3,
      stocked: false,
    },
  ];
  const savory = !/cake|cookie|muffin|pancake|waffle|dessert|smoothie|sweet|banana|oatmeal/i.test(
    recipe.title,
  );
  const pairings =
    savory && recipe.ingredients.length < 40
      ? additions
          .filter(
            (option) =>
              !excludedIngredient(option.ingredient.name, preferences) &&
              !recipe.ingredients.some(
                (item) =>
                  normalizeIngredientName(item.name) ===
                  normalizeIngredientName(option.ingredient.name),
              ),
          )
          .map((option) => ({
            ...option,
            stocked: foods.some(
              (food) =>
                normalizeIngredientName(food.name) ===
                normalizeIngredientName(option.ingredient.name),
            ),
          }))
          .sort((a, b) => Number(b.stocked) - Number(a.stocked))
          .slice(0, 3)
      : [];
  return {
    substitutions: substitutionOptions(recipe, foods).filter(
      (option) => !excludedIngredient(option.ingredient.name, preferences),
    ),
    pairings,
  };
}
