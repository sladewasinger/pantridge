import { Minus, Plus, Trash2 } from 'lucide-react';
import type { Stock, Food } from '../../domain/model';
import type { Command } from '../../domain/commands';
import { units } from '../../domain/selectors';
import { IngredientIdentity } from './IngredientIdentity';
import { stockIdentity } from '../../domain/ingredient-matching/classification';
import { StockRecipeAmount } from './StockRecipeAmount';
import { currentStandardization, stockEvidence } from '../../domain/standardization/evidence';

export function StockLot({
  stock,
  food,
  index,
  busy,
  supply = false,
  onChange,
  onRemove,
}: {
  stock: Stock;
  food: Food;
  index: number;
  busy: boolean;
  supply?: boolean;
  onChange: (command: Command) => void;
  onRemove: () => void;
}) {
  return (
    <div className="lot" role="group" aria-label={`Package ${index + 1}`}>
      {stock.product && (
        <small className="muted">
          {stock.product.brand} · {stock.product.name}
          {stock.product.source === 'openfoodfacts' && (
            <a
              className="scan-attribution"
              href={`https://world.openfoodfacts.org/product/${stock.product.barcode}`}
              target="_blank"
              rel="noreferrer"
            >
              {' '}
              · Open Food Facts
            </a>
          )}
        </small>
      )}
      <div className="lot-quantity">
        <button
          className="round"
          aria-label="Use one"
          disabled={busy || stock.quantity === 0}
          onClick={() => onChange({ type: 'stock.adjust', stockId: stock.id, delta: -1 })}
        >
          <Minus />
        </button>
        <span>{units(stock.quantity, food.unit)}</span>
        <button
          className="round"
          aria-label="Add one"
          disabled={busy || stock.quantity >= 9999}
          onClick={() => onChange({ type: 'stock.adjust', stockId: stock.id, delta: 1 })}
        >
          <Plus />
        </button>
        <button
          className="icon-button danger"
          aria-label={`Delete package ${index + 1}`}
          title="Delete package"
          disabled={busy}
          onClick={onRemove}
        >
          <Trash2 size={18} />
        </button>
      </div>
      {!supply && (
        <IngredientIdentity
          name={food.name}
          inferred={stockIdentity(food, stock) ?? null}
          value={stock.ingredient}
          standardization={currentStandardization(
            stock.standardization,
            stockEvidence(food, stock),
          )}
          disabled={busy}
          onChange={(ingredient) =>
            onChange({ type: 'stock.classify', stockId: stock.id, ingredient: ingredient ?? null })
          }
        />
      )}
      {!supply && <StockRecipeAmount stock={stock} disabled={busy} onChange={onChange} />}
      {!supply && (
        <label>
          Expiration {stock.expirySource && <span className="optional">estimated</span>}
          <input
            type="date"
            aria-label={`Expiration for lot ${stock.id}`}
            value={stock.expires ?? ''}
            disabled={busy}
            onChange={(e) =>
              onChange({ type: 'stock.date', stockId: stock.id, expires: e.target.value || null })
            }
          />
        </label>
      )}
    </div>
  );
}
