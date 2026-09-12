import type { Nutrition } from '../../domain/products/nutrition';
import type { NutritionUnit } from '../../domain/products/nutrition-amount';
import { sizeLabel, type PackageSize } from '../../domain/products/size';
import type { usePortion } from './usePortion';
import { useId } from 'react';

export function PortionControls({
  portion,
  nutrition,
  size,
}: {
  portion: ReturnType<typeof usePortion>;
  nutrition: Nutrition;
  size?: PackageSize;
}) {
  // View-only controls must not validate or submit the surrounding inventory form.
  const detachedForm = useId();
  const modes = [
    ['serving', 'Per serving', !nutrition.perServing],
    ['hundred', 'Per 100 g/ml', !portion.scalable],
    ['whole', 'Whole package', portion.wholeFactor === undefined],
    ['custom', 'Custom amount', !portion.scalable],
  ] as const;
  return (
    <>
      <div className="nutrition-basis" role="group" aria-label="Nutrition amount">
        {modes.map(([mode, label, disabled]) => (
          <button
            key={mode}
            type="button"
            disabled={disabled}
            aria-pressed={portion.mode === mode}
            onClick={() => portion.setMode(mode)}
          >
            {label}
          </button>
        ))}
      </div>
      {portion.mode === 'serving' && <p>Serving size {nutrition.serving || 'not provided'}</p>}
      {portion.mode === 'whole' && (
        <p>
          {sizeLabel(size)}
          {portion.servings !== undefined && ` · about ${portion.servings} servings`}
        </p>
      )}
      {portion.mode === 'custom' && (
        <>
          {portion.needsBasis && (
            <label>
              Label basis
              <select
                form={detachedForm}
                value={portion.labelBasis}
                onChange={(event) => portion.setLabelBasis(event.target.value as '' | 'g' | 'ml')}
              >
                <option value="">Choose the label's basis</option>
                <option value="g">Per 100 g</option>
                <option value="ml">Per 100 ml</option>
              </select>
            </label>
          )}
          <div className="form-grid nutrition-custom">
            <label>
              Amount
              <input
                form={detachedForm}
                aria-label="Nutrition amount"
                type="number"
                inputMode="decimal"
                min="0"
                max="100000"
                step="any"
                value={portion.amount}
                onChange={(event) => portion.setAmount(event.target.value)}
              />
            </label>
            <label>
              Unit
              <select
                form={detachedForm}
                aria-label="Nutrition unit"
                disabled={!portion.basis}
                value={portion.unit}
                onChange={(event) => portion.setUnit(event.target.value as NutritionUnit)}
              >
                {portion.units.map((unit) => (
                  <option key={unit}>{unit}</option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
      {portion.wholeFactor === undefined && (
        <p>Whole-package totals need a compatible package weight or volume.</p>
      )}
    </>
  );
}
