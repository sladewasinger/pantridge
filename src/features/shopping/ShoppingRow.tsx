import { Home, Pencil } from 'lucide-react';
import type { Food, ShoppingItem } from '../../domain/model';
import { units } from '../../domain/selectors';

export function ShoppingRow({
  item,
  food,
  have,
  busy,
  onEdit,
  onPurchase,
}: {
  item: ShoppingItem;
  food?: Food;
  have: number;
  busy: boolean;
  onEdit: (item: ShoppingItem) => void;
  onPurchase: (purchased: boolean) => void;
}) {
  return (
    <div className={`shop-row ${item.purchased ? 'purchased' : ''}`}>
      <label className="purchase-target">
        <input
          type="checkbox"
          aria-label={`Mark ${item.name} purchased`}
          checked={item.purchased}
          disabled={busy}
          onChange={(e) => onPurchase(e.target.checked)}
        />
      </label>
      <button className="shop-info" onClick={() => onEdit(item)} aria-label={`Edit ${item.name}`}>
        {food && <img className="shop-art" src={`/art/${food.art}.svg`} alt="" />}
        <span className="shop-copy">
          <span className="shop-name">{item.name}</span>
          <span className="home-stock">
            {item.foodId ? (
              <>
                <Home size={14} />
                <span className="sr-only">At home: </span>
                {units(have, item.unit)}
              </>
            ) : (
              'One-time item'
            )}
          </span>
        </span>
      </button>
      <button
        className="buy-quantity"
        onClick={() => onEdit(item)}
        aria-label={`Buy ${units(item.quantity, item.unit)} of ${item.name}`}
      >
        <span>{item.quantity}</span>
        <Pencil size={10} aria-hidden="true" />
      </button>
    </div>
  );
}
