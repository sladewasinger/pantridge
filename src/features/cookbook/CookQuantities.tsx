import { roundQuantity } from '../../domain/quantity';
import { sizeLabel } from '../../domain/products/size';
import type { CookRow } from './cookDraft';
import { amountLabel, dateLabel } from './presentation';

export function CookQuantities({
  rows,
  onChange,
}: {
  rows: CookRow[];
  onChange: (rows: CookRow[]) => void;
}) {
  return (
    <div className="cook-lots">
      {rows.map((row, index) => (
        <fieldset key={row.stock.id} className="cook-lot">
          <legend>
            {row.food.name} · package row {index + 1}
          </legend>
          <p>{row.food.packageSize || sizeLabel(row.food.size) || 'Package size unknown'}</p>
          {row.stock.ingredientSize && (
            <p className="muted">
              Recipe amount: {sizeLabel(row.stock.ingredientSize)} · {row.stock.ingredientSizeBasis}
            </p>
          )}
          <p className="muted">
            {amountLabel(row.stock.quantity, row.food.unit)} on hand
            {row.stock.expires ? ` · dated ${dateLabel(row.stock.expires)}` : ' · no date'}
          </p>
          <label>
            Amount used ({row.food.unit})
            <input
              type="number"
              inputMode="decimal"
              min="0"
              max={row.stock.quantity}
              step="any"
              value={row.quantity}
              onChange={(event) =>
                onChange(
                  rows.map((item) =>
                    item.stock.id === row.stock.id
                      ? { ...item, quantity: event.target.value }
                      : item,
                  ),
                )
              }
            />
          </label>
          <p className="muted">After cooking: {remainingLabel(row)}</p>
        </fieldset>
      ))}
    </div>
  );
}

function remainingLabel(row: CookRow): string {
  const used = Number(row.quantity);
  if (
    !row.quantity.trim() ||
    !Number.isFinite(used) ||
    used < 0 ||
    used > row.stock.quantity ||
    roundQuantity(used) !== used
  )
    return 'Check amount';
  return amountLabel(roundQuantity(row.stock.quantity - used), row.food.unit);
}
