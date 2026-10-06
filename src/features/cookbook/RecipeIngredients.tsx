import type { getRecipeAvailability } from '../../domain/recipes/availability';
import { getSubstitutions } from '../../domain/recipes/substitutions';
import { amountLabel, dateLabel } from './presentation';

type IngredientMatch = ReturnType<typeof getRecipeAvailability>['ingredients'][number];
function matchCopy(match: IngredientMatch): string {
  if (match.status === 'confirmed')
    return `${amountLabel(match.available ?? 0, match.ingredient.unit)} on hand`;
  if (match.status === 'needs-review') return 'Name matched · check package size and amount';
  if (match.missing !== undefined)
    return `Need ${amountLabel(match.missing, match.ingredient.unit)} more`;
  return 'Not confirmed in your kitchen';
}
export function RecipeIngredients({ ingredients }: { ingredients: IngredientMatch[] }) {
  return (
    <section className="recipe-ingredients" aria-label="Ingredients and kitchen match">
      <h3>Ingredients</h3>
      <ul>
        {ingredients.map((match) => (
          <IngredientRow key={match.ingredient.id} match={match} />
        ))}
      </ul>
      <p className="muted">
        Amounts use saved package sizes where known. Check labels, dates and ingredient condition.
      </p>
    </section>
  );
}
function IngredientRow({ match }: { match: IngredientMatch }) {
  const substitutions = getSubstitutions(match.ingredient.name);
  return (
    <li>
      <div className="recipe-ingredient-line">
        <strong>{match.ingredient.name}</strong>
        <span>{amountLabel(match.required, match.ingredient.unit)}</span>
      </div>
      {match.ingredient.optional && <small>Optional</small>}
      {match.ingredient.note && <small>{match.ingredient.note}</small>}
      <small className={`ingredient-match ${match.status}`}>{matchCopy(match)}</small>
      {match.earliestExpiry && <small>Dated {dateLabel(match.earliestExpiry)}</small>}
      {substitutions.length > 0 && (
        <details className="recipe-substitutions">
          <summary>Substitution ideas</summary>
          <ul>
            {substitutions.map((item) => (
              <li key={item.name}>
                <strong>{item.name}</strong> · {item.note}
              </li>
            ))}
          </ul>
          <p>
            Suggestions only. Check amounts, allergies and suitability; nothing is replaced
            automatically.
          </p>
        </details>
      )}
    </li>
  );
}
