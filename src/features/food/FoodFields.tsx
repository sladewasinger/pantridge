import { unitSchema, type Food } from '../../domain/model';
import { ArtPicker } from './ArtPicker';
export function FoodFields({
  food,
  onChange,
  identity = true,
}: {
  food: Food;
  onChange: (food: Food) => void;
  identity?: boolean;
}) {
  const patch = (value: Partial<Food>) => onChange({ ...food, ...value });
  return (
    <>
      <label>
        Food name
        <input
          required
          maxLength={80}
          value={food.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="e.g. Black beans"
        />
      </label>
      {identity && (
        <>
          <label>
            Unit
            <select
              value={food.unit}
              onChange={(e) => patch({ unit: unitSchema.parse(e.target.value) })}
            >
              {unitSchema.options.map((unit) => (
                <option key={unit}>{unit}</option>
              ))}
            </select>
          </label>
          <ArtPicker value={food.art} onChange={(art) => patch({ art })} />
        </>
      )}
      <div className="form-grid">
        <label>
          Keep in
          <select
            value={food.frozen ? 'freezer' : food.location}
            onChange={(e) =>
              patch({
                location: e.target.value === 'pantry' ? 'pantry' : 'fridge',
                frozen: e.target.value === 'freezer',
              })
            }
          >
            <option value="pantry">Pantry</option>
            <option value="fridge">Fridge</option>
            <option value="freezer">Freezer</option>
          </select>
        </label>
        <label>
          Shelf
          <select value={food.shelf} onChange={(e) => patch({ shelf: Number(e.target.value) })}>
            <option value={0}>Top shelf</option>
            <option value={1}>Middle shelf</option>
            <option value={2}>Bottom shelf</option>
          </select>
        </label>
      </div>
      <details>
        <summary>Brand & package details</summary>
        <label>
          Brand
          <input
            maxLength={80}
            value={food.brand}
            onChange={(e) => patch({ brand: e.target.value })}
          />
        </label>
        <label>
          Package size
          <input
            maxLength={80}
            value={food.packageSize}
            onChange={(e) => patch({ packageSize: e.target.value })}
            placeholder="e.g. 12-count"
          />
        </label>
      </details>
    </>
  );
}
