import type { Nutrition, Nutrients } from '../../domain/products/nutrition';
import type { PackageSize } from '../../domain/products/size';
import { usePortion } from './usePortion';
import { PortionControls } from './PortionControls';
const rows: [keyof Nutrients, string, string][] = [
  ['fat', 'Fat', 'g'],
  ['saturatedFat', 'Saturated fat', 'g'],
  ['sodium', 'Sodium', 'mg'],
  ['carbohydrates', 'Carbohydrate', 'g'],
  ['fiber', 'Fiber', 'g'],
  ['sugars', 'Sugars', 'g'],
  ['protein', 'Protein', 'g'],
];
export function NutritionLabel({
  nutrition,
  name,
  size,
}: {
  nutrition: Nutrition;
  name: string;
  size?: PackageSize;
}) {
  const portion = usePortion(nutrition, size);
  const { values } = portion;
  return (
    <section className="nutrition-label" aria-label="Nutrition information">
      <h3>Nutrition Facts</h3>
      <p>{name}</p>
      <PortionControls portion={portion} nutrition={nutrition} size={size} />
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
