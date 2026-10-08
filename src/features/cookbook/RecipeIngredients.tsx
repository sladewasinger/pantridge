import type { getRecipeAvailability } from '../../domain/recipes/availability';
import { getSubstitutions } from '../../domain/recipes/substitutions';
import { amountLabel, summaryAmountLabel, dateLabel } from './presentation';
import type { Snapshot } from '../../domain/model';
import { recipeIdentity } from '../../domain/ingredient-matching/classification';

type IngredientMatch = ReturnType<typeof getRecipeAvailability>['ingredients'][number];
function matchCopy(match: IngredientMatch): string {
  if (match.status === 'confirmed')
    return `${summaryAmountLabel(match.available ?? 0, match.ingredient.unit)} on hand`;
  if (match.status === 'needs-review') return 'On hand · review preparation and amount';
  if (match.missing !== undefined)
    return `Need ${summaryAmountLabel(match.missing, match.ingredient.unit)}${(match.available ?? 0) > 0 ? ' more' : ''}`;
  return 'Not confirmed in your kitchen';
}
export function RecipeIngredients({
  ingredients,
  data,
}: {
  ingredients: IngredientMatch[];
  data?: Snapshot;
}) {
  return (
    <section className="recipe-ingredients" aria-label="Ingredients and kitchen match">
      <h3>Ingredients</h3>
      <ul>
        {ingredients.map((match) => (
          <IngredientRow key={match.ingredient.id} match={match} data={data} />
        ))}
      </ul>
      <p className="muted">
        Amounts use saved package sizes where known. Check labels, dates and ingredient condition.
      </p>
    </section>
  );
}
function IngredientRow({ match }: { match: IngredientMatch; data?: Snapshot }) {
  const substitutions = getSubstitutions(match.ingredient.name);
  const preparation = recipeIdentity(match.ingredient)?.preparation;
  const showPreparation =
    preparation &&
    ['dry', 'cooked', 'canned', 'frozen'].includes(preparation) &&
    !match.ingredient.note &&
    !match.ingredient.name.toLowerCase().includes(preparation);
  return (
    <li>
      <div className="recipe-ingredient-line">
        <strong>{match.ingredient.name}</strong>
        <span>{amountLabel(match.required, match.ingredient.unit)}</span>
      </div>
      {match.ingredient.optional && <small>Optional</small>}
      {match.ingredient.note && <small>{match.ingredient.note}</small>}
      {showPreparation && <small>{preparation}</small>}
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
