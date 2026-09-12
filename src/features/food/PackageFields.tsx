import type { Food } from '../../domain/model';
import { measureSchema, sizeLabel } from '../../domain/products/size';

export function PackageFields({ food, onChange }: { food: Food; onChange: (food: Food) => void }) {
  const size = food.size;
  function amount(value: string) {
    if (!value) {
      onChange({ ...food, size: undefined, packageSize: '' });
      return;
    }
    const next = { amount: Number(value), measure: size?.measure ?? 'oz', packs: size?.packs ?? 1 };
    onChange({ ...food, size: next, packageSize: sizeLabel(next) });
  }
  return (
    <fieldset className="package-fields">
      <legend>Package size</legend>
      <div className="form-grid">
        <label>
          Size
          <input
            type="number"
            inputMode="decimal"
            min="0.001"
            max="100000"
            step="any"
            value={size?.amount ?? ''}
            onChange={(e) => amount(e.target.value)}
            placeholder="Unspecified"
          />
        </label>
        <label>
          Measure
          <select
            value={size?.measure ?? 'oz'}
            disabled={!size}
            onChange={(e) => {
              if (!size) return;
              const next = { ...size, measure: measureSchema.parse(e.target.value) };
              onChange({ ...food, size: next, packageSize: sizeLabel(next) });
            }}
          >
            {measureSchema.options.map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </select>
        </label>
      </div>
      {!size && food.packageSize && <p className="muted">Saved size: {food.packageSize}</p>}
    </fieldset>
  );
}
