import { unitSchema, locationSchema, type Food } from '../../domain/model';
import { ArtPicker } from './ArtPicker';
import { PackageFields } from './PackageFields';
import { useArtworkMatch } from './useArtworkMatch';
import type { ReactNode } from 'react';
import { isSupply, normalizeSupply } from '../../domain/supplies';
import { storagePlace } from '../../domain/selectors';
import { IngredientIdentity } from './IngredientIdentity';
import { foodIdentity } from '../../domain/ingredient-matching/classification';
import { currentStandardization, foodEvidence } from '../../domain/standardization/evidence';
export function FoodFields({
  food,
  onChange,
  identity = true,
  compact = false,
  autoArtwork = false,
  onEdit,
  quantityControl,
}: {
  food: Food;
  onChange: (food: Food) => void;
  identity?: boolean;
  compact?: boolean;
  autoArtwork?: boolean;
  onEdit?: (...keys: (keyof Food)[]) => void;
  quantityControl?: ReactNode;
}) {
  const supply = isSupply(food);
  const change = (next: Food) => onChange(normalizeSupply(next));
  const patch = (value: Partial<Food>) => {
    onEdit?.(...(Object.keys(value) as (keyof Food)[]));
    change({ ...food, ...value });
  };
  const illustration = useArtworkMatch(food, change, autoArtwork);
  const selectArt = (art: Food['art']) => {
    onEdit?.('art');
    illustration.select(art);
  };
  return (
    <>
      <label>
        {supply ? 'Supply name' : 'Food name'}
        <input
          required
          maxLength={80}
          value={food.name}
          onChange={(e) => {
            onEdit?.('name');
            illustration.rename(e.target.value);
          }}
          placeholder={supply ? 'e.g. Paper towels' : 'e.g. Black beans'}
        />
      </label>
      {quantityControl}
      {!supply && (
        <IngredientIdentity
          name={food.name}
          value={food.ingredient}
          inferred={foodIdentity(food)}
          standardization={currentStandardization(food.standardization, foodEvidence(food))}
          onChange={(ingredient) => patch({ ingredient })}
        />
      )}
      <label>
        Item type
        <select
          value={supply ? 'supply' : 'food'}
          onChange={(e) => patch({ kind: e.target.value === 'supply' ? 'supply' : 'food' })}
        >
          <option value="food">Food</option>
          <option value="supply">Kitchen supply</option>
        </select>
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
          <PackageFields food={food} onChange={change} />
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
      <div>
        <label>
          Keep in
          <select
            value={storagePlace(food)}
            disabled={supply}
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
            <option value="unspecified">Storage</option>
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
