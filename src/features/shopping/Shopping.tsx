import { Home, Pencil, ShoppingBasket } from 'lucide-react';
import { dispatch, useKitchen } from '../../data/store';
import type { ShoppingItem } from '../../domain/model';
import { countFood, units } from '../../domain/selectors';
import { useAction } from '../../ui/useAction';

export function Shopping({
  onEdit,
  onPutAway,
}: {
  onEdit: (item: ShoppingItem) => void;
  onPutAway: () => void;
}) {
  const { data } = useKitchen();
  const { run, error, busy } = useAction();
  const purchased = data.shopping.filter((item) => item.purchased).length;
  return (
    <div className="shopping-list">
      {!data.shopping.length && (
        <div className="empty-state">
          <ShoppingBasket size={38} strokeWidth={1.3} />
          <h2>A fresh list</h2>
          <p>Add your next grocery run with the + button.</p>
        </div>
      )}
      {data.shopping.map((item) => (
        <div className={`shop-row ${item.purchased ? 'purchased' : ''}`} key={item.id}>
          <input
            type="checkbox"
            aria-label={`Mark ${item.name} purchased`}
            checked={item.purchased}
            disabled={busy}
            onChange={(e) =>
              void run(() =>
                dispatch({
                  type: 'shopping.purchase',
                  itemId: item.id,
                  purchased: e.target.checked,
                }),
              )
            }
          />
          <button
            className="shop-info"
            onClick={() => onEdit(item)}
            aria-label={`Edit ${item.name}`}
          >
            <span className="shop-name">{item.name}</span>
            {item.foodId ? (
              <span className="home-stock">
                <Home size={14} />
                <span className="sr-only">At home: </span>
                {units(countFood(data, item.foodId), item.unit)}
              </span>
            ) : (
              <span className="home-stock">One-time item</span>
            )}
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
      ))}
      {purchased > 0 && (
        <button className="primary full put-away" onClick={onPutAway}>
          Put groceries away <span className="count-pill">{purchased}</span>
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
