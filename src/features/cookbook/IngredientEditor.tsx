import { Trash2 } from 'lucide-react';
import type { RecipeUnit } from '../../domain/recipes/model';
import { emptyIngredient, type IngredientDraft } from './editorState';

const units: RecipeUnit[] = [
  'count',
  'g',
  'kg',
  'oz',
  'lb',
  'ml',
  'l',
  'fl oz',
  'gal',
  'tsp',
  'tbsp',
  'cup',
  'package',
];
export function IngredientEditor({
  ingredients,
  onChange,
}: {
  ingredients: IngredientDraft[];
  onChange: (value: IngredientDraft[]) => void;
}) {
  const update = (id: string, patch: Partial<IngredientDraft>) =>
    onChange(ingredients.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  return (
    <section aria-label="Recipe ingredients">
      <h3>Ingredients</h3>
      {ingredients.map((item, index) => (
        <fieldset className="recipe-ingredient-editor" key={item.id}>
          <legend>Ingredient {index + 1}</legend>
          <label>
            Name
            <input
              value={item.name}
              maxLength={80}
              onChange={(event) => update(item.id, { name: event.target.value })}
            />
          </label>
          <div className="form-grid">
            <label>
              Amount
              <input
                type="number"
                min="0"
                step="any"
                inputMode="decimal"
                value={item.quantity}
                onChange={(event) => update(item.id, { quantity: event.target.value })}
              />
            </label>
            <label>
              Unit
              <select
                value={item.unit}
                onChange={(event) => update(item.id, { unit: event.target.value as RecipeUnit })}
              >
                {units.map((unit) => (
                  <option key={unit}>{unit}</option>
                ))}
              </select>
            </label>
          </div>
          <label>
            Note <span className="optional">optional</span>
            <input
              value={item.note ?? ''}
              maxLength={240}
              onChange={(event) => update(item.id, { note: event.target.value })}
            />
          </label>
          <div className="recipe-ingredient-footer">
            <label className="check-label">
              <input
                type="checkbox"
                checked={item.optional}
                onChange={(event) => update(item.id, { optional: event.target.checked })}
              />
              Optional
            </label>
            <button
              type="button"
              className="icon-button danger"
              aria-label={`Remove ingredient ${index + 1}`}
              onClick={() => onChange(ingredients.filter((row) => row.id !== item.id))}
            >
              <Trash2 size={18} />
            </button>
          </div>
        </fieldset>
      ))}
      <button
        type="button"
        className="secondary full"
        disabled={ingredients.length >= 40}
        onClick={() => onChange([...ingredients, emptyIngredient()])}
      >
        Add ingredient
      </button>
    </section>
  );
}
