import type { Recipe } from '../../domain/recipes/model';
import type { RecipePreferences } from '../../domain/recipe-preferences/model';
import { assessRecipeDiet } from '../../domain/recipe-preferences/assessment';

export function DietReview({
  recipe,
  preferences,
  checked,
  onChange,
}: {
  recipe: Recipe;
  preferences: RecipePreferences;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  if (!preferences.restrictions.length) return null;
  const assessment = assessRecipeDiet(recipe, preferences);
  return (
    <details className="recipe-diet-review">
      <summary>
        Diet check · {assessment.conflicts.length ? 'ingredient conflicts' : 'review labels'}
      </summary>
      {assessment.conflicts.length > 0 && (
        <p className="error">
          Conflicts with your choices: {assessment.conflicts.join(', ')}. Edit or substitute before
          saving.
        </p>
      )}
      {assessment.labels.length > 0 && (
        <p className="muted">Check package ingredients: {assessment.labels.join(', ')}.</p>
      )}
      {assessment.crossContact && (
        <p className="muted">
          Names cannot verify allergens, gluten-free labeling or cross-contact. Check products and
          preparation.
        </p>
      )}
      {!assessment.conflicts.length && (
        <label className="check-label">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onChange(event.target.checked)}
          />
          I reviewed labels and preparation for my dietary choices.
        </label>
      )}
    </details>
  );
}
