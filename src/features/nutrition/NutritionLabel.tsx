import { useState } from 'react';
import type { Nutrition, Nutrients } from '../../domain/products/nutrition';
const rows: [keyof Nutrients, string, string][] = [
  ['fat', 'Fat', 'g'],
  ['saturatedFat', 'Saturated fat', 'g'],
  ['sodium', 'Sodium', 'mg'],
  ['carbohydrates', 'Carbohydrate', 'g'],
  ['fiber', 'Fiber', 'g'],
  ['sugars', 'Sugars', 'g'],
  ['protein', 'Protein', 'g'],
];
export function NutritionLabel({ nutrition, name }: { nutrition: Nutrition; name: string }) {
  const [serving, setServing] = useState(true);
  const perServing = serving && !!nutrition.perServing;
  const values = (perServing ? nutrition.perServing : nutrition.per100)!;
  return (
    <section className="nutrition-label" aria-label="Nutrition information">
      <h3>Nutrition Facts</h3>
      <p>{name}</p>
      <div className="nutrition-basis">
        <button
          type="button"
          aria-pressed={perServing}
          disabled={!nutrition.perServing}
          onClick={() => setServing(true)}
        >
          Per serving
        </button>
        <button type="button" aria-pressed={!perServing} onClick={() => setServing(false)}>
          Per 100 g/ml
        </button>
      </div>
      {perServing && <p>Serving size {nutrition.serving || 'not provided'}</p>}
      <div className="nutrition-calories">
        <strong>Calories</strong>
        <b>{values.calories === undefined ? '—' : Math.round(values.calories)}</b>
      </div>
      <dl>
        {rows.map(([key, label, unit]) => (
          <div key={key}>
            <dt>{label}</dt>
            <dd>{values[key] === undefined ? '—' : `${values[key]} ${unit}`}</dd>
          </div>
        ))}
      </dl>
      <small>As sold. — means not provided. Values vary by package; check its label.</small>
    </section>
  );
}
