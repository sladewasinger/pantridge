import { restrictions, type RecipePreferences } from '../../domain/recipe-preferences/model';

const labels: Record<string, string> = {
  vegetarian: 'Vegetarian',
  vegan: 'Vegan',
  'gluten-free': 'Gluten free',
  celiac: 'Celiac: exclude gluten',
  'dairy-free': 'Dairy free',
  'lactose-free': 'Lactose free',
  milk: 'Milk allergy',
  egg: 'Egg allergy',
  fish: 'Fish allergy',
  shellfish: 'Shellfish allergy',
  peanut: 'Peanut allergy',
  'tree-nut': 'Tree nut allergy',
  wheat: 'Wheat allergy',
  soy: 'Soy allergy',
  sesame: 'Sesame allergy',
};
export function PreferenceOptions({
  value,
  onChange,
}: {
  value: RecipePreferences;
  onChange: (next: RecipePreferences) => void;
}) {
  const patch = (next: Partial<RecipePreferences>) => onChange({ ...value, ...next });
  return (
    <div className="recipe-preference-options">
      <div className="form-grid">
        {(['maxMinutes', 'minProtein', 'maxCarbs'] as const).map((key) => (
          <label key={key}>
            {
              {
                maxMinutes: 'Time limit (min)',
                minProtein: 'Min protein (g/serving)',
                maxCarbs: 'Max carbs (g/serving)',
              }[key]
            }
            <input
              type="number"
              inputMode="numeric"
              min="5"
              max={key === 'maxMinutes' ? 180 : key === 'minProtein' ? 100 : 150}
              value={value[key] ?? ''}
              placeholder="Optional"
              onChange={(event) =>
                patch({ [key]: event.target.value ? Number(event.target.value) : undefined })
              }
            />
          </label>
        ))}
        <label>
          Meal
          <select
            value={value.meal ?? ''}
            onChange={(event) =>
              patch({ meal: (event.target.value as RecipePreferences['meal']) || undefined })
            }
          >
            <option value="">Any meal</option>
            {['breakfast', 'lunch', 'dinner', 'snack'].map((meal) => (
              <option key={meal} value={meal}>
                {meal}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label>
        Cuisine
        <input
          maxLength={60}
          value={value.cuisine ?? ''}
          placeholder="Optional"
          onChange={(event) => patch({ cuisine: event.target.value })}
        />
      </label>
      <label>
        Equipment
        <input
          maxLength={80}
          value={value.equipment ?? ''}
          placeholder="e.g. stove and one pan"
          onChange={(event) => patch({ equipment: event.target.value })}
        />
      </label>
      <label>
        Anything else?
        <input
          maxLength={160}
          value={value.request ?? ''}
          placeholder="e.g. a cozy bowl, gently spicy"
          onChange={(event) => patch({ request: event.target.value })}
        />
      </label>
      <label>
        Foods to avoid
        <input
          maxLength={809}
          defaultValue={value.avoid.join(', ')}
          key={value.avoid.length === 0 ? 'empty' : 'filled'}
          placeholder="Up to 10, separated by commas"
          onBlur={(event) =>
            patch({
              avoid: [
                ...new Set(
                  event.target.value
                    .split(',')
                    .map((item) => item.trim())
                    .filter(Boolean),
                ),
              ].slice(0, 10),
            })
          }
        />
      </label>
      <details>
        <summary>
          Diet &amp; allergens
          {value.restrictions.length ? ` · ${value.restrictions.length} selected` : ''}
        </summary>
        <div className="recipe-diet-options">
          {restrictions.map((restriction) => (
            <label className="check-label" key={restriction}>
              <input
                type="checkbox"
                checked={value.restrictions.includes(restriction)}
                onChange={(event) =>
                  patch({
                    restrictions: event.target.checked
                      ? [...value.restrictions, restriction]
                      : value.restrictions.filter((item) => item !== restriction),
                  })
                }
              />
              {labels[restriction]}
            </label>
          ))}
        </div>
        <p className="muted">
          Names cannot verify package labels or cross-contact. Review these before cooking.
        </p>
      </details>
    </div>
  );
}
