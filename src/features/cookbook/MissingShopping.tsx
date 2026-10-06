import { dispatch, useKitchen } from '../../data/store';
import type { Recipe } from '../../domain/recipes/model';
import { buildMissingShopping } from '../../domain/recipes/shopping';
import { prepareShopping, ShoppingReview } from './ShoppingReview';

export function MissingShopping({ recipe, servings }: { recipe: Recipe; servings: number }) {
  const { data } = useKitchen();
  const proposal = prepareShopping(() =>
    buildMissingShopping(data, recipe, servings, () => crypto.randomUUID()),
  );
  return (
    <details className="recipe-shopping">
      <summary>Add missing to shopping</summary>
      <ShoppingReview
        proposal={proposal}
        onAdd={(items) =>
          dispatch({ type: 'recipe.addMissing', recipeId: recipe.id, servings, items })
        }
      />
    </details>
  );
}
