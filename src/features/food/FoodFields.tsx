import { unitSchema, locationSchema, type Food } from '../../domain/model';
import { ArtPicker } from './ArtPicker';
import { PackageFields } from './PackageFields';
import { useArtworkMatch } from './useArtworkMatch';
export function FoodFields({
  food,
  onChange,
  identity = true,
  compact = false,
  autoArtwork = false,
  onEdit,
}: {
  food: Food;
  onChange: (food: Food) => void;
  identity?: boolean;
  compact?: boolean;
  autoArtwork?: boolean;
  onEdit?: (...keys: (keyof Food)[]) => void;
}) {
  const patch = (value: Partial<Food>) => {
    onEdit?.(...(Object.keys(value) as (keyof Food)[]));
    onChange({ ...food, ...value });
  };
  const illustration = useArtworkMatch(food, onChange, autoArtwork);
  const selectArt = (art: Food['art']) => {
    onEdit?.('art');
    illustration.select(art);
  };
  return (
    <>
      <label>
        Food name
        <input
          required
          maxLength={80}
          value={food.name}
          onChange={(e) => {
            onEdit?.('name');
            illustration.rename(e.target.value);
          }}
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
          <PackageFields food={food} onChange={onChange} />
          {compact ? (
            <details>
              <summary>Change artwork</summary>
              <ArtPicker value={illustration.value} onChange={selectArt} />
            </details>
          ) : (
            <ArtPicker value={illustration.value} onChange={selectArt} />
          )}
        </>
      )}
      <div className="form-grid">
        <label>
          Keep in
          <select
            value={food.frozen ? 'freezer' : food.location}
            onChange={(e) =>
              patch({
                location:
                  e.target.value === 'freezer' ? 'fridge' : locationSchema.parse(e.target.value),
                frozen: e.target.value === 'freezer',
              })
            }
          >
            <option value="pantry">Pantry</option>
            <option value="fridge">Fridge</option>
            <option value="freezer">Freezer</option>
            <option value="unspecified">Unspecified</option>
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
            onChange={(e) => patch({ packageSize: e.target.value, size: undefined })}
            placeholder="e.g. 12-count"
          />
        </label>
      </details>
    </>
  );
}
