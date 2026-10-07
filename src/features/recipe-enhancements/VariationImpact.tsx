import type { Recipe } from '../../domain/recipes/model';
import type { RecipeVariation } from '../../domain/recipe-variations/model';
import { variationNutritionPreview } from '../../domain/recipe-variations/preview';
import { withCalculatedNutrition } from '../../domain/recipe-nutrition/calculate';
import { useKitchen } from '../../data/store';
import { RecipeNutrition } from '../cookbook/RecipeNutrition';

export function VariationImpact({
  recipe,
  variation,
  dietary,
}: {
  recipe: Recipe;
  variation: RecipeVariation;
  dietary: boolean;
}) {
  const { data } = useKitchen();
  return (
    <details>
      <summary>Preview nutrition{dietary ? ' & diet review' : ''}</summary>
      <p className="muted">Estimated totals if applied; ingredients and stock are unchanged.</p>
      <RecipeNutrition
        recipe={withCalculatedNutrition(data, variationNutritionPreview(recipe, variation))}
      />
      {dietary && (
        <p className="muted">
          No known name conflict with your selections. Package labels and preparation still need
          review after applying.
        </p>
      )}
    </details>
  );
}
