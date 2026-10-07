import type { Recipe } from '../../domain/recipes/model';

export function RecipeExtras({ recipe }: { recipe: Recipe }) {
  if (!recipe.untrackedIngredients?.length) return null;
  return (
    <section className="recipe-extras" aria-label="Additional ingredients">
      <h3>Additional ingredients</h3>
      <ul>
        {recipe.untrackedIngredients.map((item, index) => (
          <li key={index}>{item}</li>
        ))}
      </ul>
      <p className="muted">
        Water, garnishes and unmeasured amounts aren’t included in shopping or suggested stock
        deductions. Add measured ingredients before recording their stock use.
      </p>
    </section>
  );
}

export function RecipeNutrition({ recipe }: { recipe: Recipe }) {
  const nutrition = recipe.nutrition;
  if (!nutrition) return null;
  const values = [
    ['Calories', nutrition.calories, 'kcal'],
    ['Protein', nutrition.protein, 'g'],
    ['Carbs', nutrition.carbohydrate, 'g'],
    ['Fat', nutrition.fat, 'g'],
    ['Sodium', nutrition.sodium, 'mg'],
    ['Fiber', nutrition.fiber, 'g'],
  ] as const;
  return (
    <section className="recipe-nutrition" aria-label="Estimated nutrition">
      <h3>Estimated nutrition</h3>
      <p className="muted">Per {nutrition.portion.toLowerCase()} · publisher’s estimate</p>
      <dl>
        {values.map(
          ([label, value, unit]) =>
            (value !== undefined || label === 'Carbs') && (
              <div key={label}>
                <dt>{label}</dt>
                <dd>
                  {value === undefined
                    ? 'Not provided'
                    : `${new Intl.NumberFormat(undefined, { maximumFractionDigits: 1 }).format(value)} ${unit}`}
                </dd>
              </div>
            ),
        )}
      </dl>
      <p className="muted">Brands, portions and substitutions change these values.</p>
    </section>
  );
}
