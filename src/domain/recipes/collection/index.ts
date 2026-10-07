import breakfast from './01.json' with { type: 'json' };
import pantry from './02.json' with { type: 'json' };
import vegetables from './03.json' with { type: 'json' };
import soups from './04.json' with { type: 'json' };
import quickChicken from './05.json' with { type: 'json' };
import chicken from './06.json' with { type: 'json' };
import pasta from './07.json' with { type: 'json' };
import beef from './08.json' with { type: 'json' };
import fishAndPork from './09.json' with { type: 'json' };
import sides from './10.json' with { type: 'json' };
import { recipeSchema } from '../model';
import { classifyRecipeIngredient } from '../../ingredient-matching/classification';

// Stable IDs let saved copies override bundled recipes without changing old plans.
export const curatedRecipes = [
  ...breakfast,
  ...pantry,
  ...vegetables,
  ...soups,
  ...quickChicken,
  ...chicken,
  ...pasta,
  ...beef,
  ...fishAndPork,
  ...sides,
].map((input) => {
  const recipe = recipeSchema.parse(input);
  return { ...recipe, ingredients: recipe.ingredients.map(classifyRecipeIngredient) };
});
