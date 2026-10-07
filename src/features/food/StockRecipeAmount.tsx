import { useState } from 'react';
import type { Stock } from '../../domain/model';
import type { Command } from '../../domain/commands';
import { sizeSchema, measureSchema } from '../../domain/products/size';

export function StockRecipeAmount({
  stock,
  disabled,
  onChange,
}: {
  stock: Stock;
  disabled: boolean;
  onChange: (command: Command) => void;
}) {
  const [amount, setAmount] = useState(
    stock.ingredientSize ? String(stock.ingredientSize.amount * stock.ingredientSize.packs) : '',
  );
  const [measure, setMeasure] = useState(stock.ingredientSize?.measure ?? 'g');
  const parsed = sizeSchema.safeParse({ amount: Number(amount), measure, packs: 1 });
  return (
    <details className="recipe-substitutions">
      <summary>Recipe amount per package</summary>
      <p className="muted">
        Enter a measured drained or edible amount. Set the same amount basis in Recipe matching.
      </p>
      <div className="form-grid">
        <label>
          Amount
          <input
            type="number"
            min="0"
            step="any"
            inputMode="decimal"
            value={amount}
            disabled={disabled}
            onChange={(event) => setAmount(event.target.value)}
          />
        </label>
        <label>
          Measure
          <select
            value={measure}
            disabled={disabled}
            onChange={(event) => setMeasure(measureSchema.parse(event.target.value))}
          >
            {measureSchema.options.map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </select>
        </label>
      </div>
      <button
        type="button"
        className="secondary"
        disabled={disabled || !parsed.success}
        onClick={() => {
          if (parsed.success)
            onChange({ type: 'stock.recipeAmount', stockId: stock.id, size: parsed.data });
        }}
      >
        Save recipe amount
      </button>
      {stock.ingredientSize && (
        <button
          type="button"
          className="text-button"
          disabled={disabled}
          onClick={() => {
            setAmount('');
            onChange({ type: 'stock.recipeAmount', stockId: stock.id, size: null });
          }}
        >
          Use package label amount
        </button>
      )}
    </details>
  );
}
