import type { Recipe } from '../../domain/recipes/model';
import type { RecipePreferences } from '../../domain/recipe-preferences/model';
import { recipeVariations } from '../../domain/recipe-variations/options';
import { applyVariation } from '../../domain/recipe-variations/apply';
import { withCalculatedNutrition } from '../../domain/recipe-nutrition/calculate';
import { useKitchen } from '../../data/store';
import { amountLabel, todayLocal } from '../cookbook/presentation';
import { VariationImpact } from './VariationImpact';
import { useAction } from '../../ui/useAction';

export function RecipeVariations({
  recipe,
  preferences,
  busy,
  changed,
  onChange,
  onUndo,
}: {
  recipe: Recipe;
  preferences: RecipePreferences;
  busy: boolean;
  changed: boolean;
  onChange: (next: Recipe) => void;
  onUndo: () => void;
}) {
  const { data } = useKitchen();
  const { run, error } = useAction();
  const options = recipeVariations(data, recipe, preferences, todayLocal());
  return (
    <details className="recipe-variations">
      <summary>Make it yours{changed ? ' · changed' : ''}</summary>
      {changed && (
        <button type="button" className="text-button" disabled={busy} onClick={onUndo}>
          Undo variations
        </button>
      )}
      {(
        [
          ['Substitutions', options.substitutions],
          ['Spice it up', options.pairings],
        ] as const
      ).map(([title, choices]) =>
        choices.length ? (
          <section key={title} aria-label={title}>
            <h3>{title}</h3>
            {choices.map((option) => (
              <div className="recipe-variation" key={option.id}>
                <strong>{option.label}</strong>
                <span className="muted">
                  {option.stocked ? 'In your kitchen · check amounts' : 'Needs shopping'}
                </span>
                <p>
                  {amountLabel(option.ingredient.quantity, option.ingredient.unit)}{' '}
                  {option.ingredient.name} · {option.why}
                </p>
                <p className="muted">{option.preparation}</p>
                <VariationImpact
                  recipe={recipe}
                  variation={option}
                  dietary={preferences.restrictions.length > 0}
                />
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    void run(async () =>
                      onChange(
                        withCalculatedNutrition(
                          data,
                          applyVariation(recipe, option, crypto.randomUUID()),
                        ),
                      ),
                    )
                  }
                >
                  Apply
                </button>
              </div>
            ))}
          </section>
        ) : null,
      )}
      {!options.substitutions.length && !options.pairings.length && (
        <p className="muted">No compatible variations here. Edit for more control.</p>
      )}
      <p className="muted">
        Changes update this preview. Save to keep them; shopping and stock still require review.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </details>
  );
}
