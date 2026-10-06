import type { MealPlanEntry, Recipe } from '../../domain/recipes/model';
import { dateLabel, recipeMeta } from './presentation';

const sourceLabels: Record<Recipe['source'], string> = {
  starter: 'Curated starter recipe',
  manual: 'Your recipe',
  import: 'Imported recipe',
  ai: 'AI-generated recipe · review before cooking',
};
export function RecipeSummary({ recipe }: { recipe: Recipe }) {
  return (
    <>
      <p className="recipe-meta">{recipeMeta(recipe)}</p>
      {recipe.description && <p>{recipe.description}</p>}
      <p className="recipe-provenance">
        {sourceLabels[recipe.source]}
        {recipe.sourceUrl && (
          <>
            {' '}
            ·{' '}
            <a href={recipe.sourceUrl} target="_blank" rel="noreferrer">
              Source
            </a>
          </>
        )}
      </p>
    </>
  );
}
export function RecipeServings({
  value,
  onChange,
  plan,
  stale,
}: {
  value: string;
  onChange: (value: string) => void;
  plan?: MealPlanEntry;
  stale: boolean;
}) {
  const valid = Number.isFinite(Number(value)) && Number(value) > 0 && Number(value) <= 100;
  return (
    <>
      {plan && (
        <p className="muted">
          Planned for {dateLabel(plan.date)}. Confirming cooking will complete this planned meal.
        </p>
      )}
      {stale && (
        <p className="error" role="alert">
          This planned meal changed. Close and reopen it to review the current plan.
        </p>
      )}
      <label className="recipe-servings">
        Servings
        <input
          type="number"
          min="0.1"
          max="100"
          step="any"
          inputMode="decimal"
          value={value}
          readOnly={Boolean(plan)}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
      {!valid && (
        <p className="error" role="alert">
          Enter servings greater than 0 and no more than 100.
        </p>
      )}
    </>
  );
}
