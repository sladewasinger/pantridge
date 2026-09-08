import { dispatch, useKitchen } from '../../data/store';
import type { ShoppingItem } from '../../domain/model';
import { countFood } from '../../domain/selectors';
import { useAction } from '../../ui/useAction';
import { ShoppingRow } from './ShoppingRow';

export function Shopping({
  query,
  onAdd,
  onEdit,
  onPutAway,
}: {
  query: string;
  onAdd: () => void;
  onEdit: (item: ShoppingItem) => void;
  onPutAway: () => void;
}) {
  const { data } = useKitchen();
  const { run, error, busy } = useAction();
  const purchased = data.shopping.filter((item) => item.purchased).length;
  const remaining = data.shopping.length - purchased;
  const matches = data.shopping
    .filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase()))
    .toSorted((a, b) => Number(a.purchased) - Number(b.purchased));
  return (
    <div className="shopping-list">
      {!data.shopping.length ? (
        <div className="empty-state">
          <img className="empty-art" src="/art/shopping.svg" alt="" />
          <h2>A fresh list</h2>
          <button className="secondary" onClick={onAdd}>
            Add your first item
          </button>
        </div>
      ) : (
        <div className="shopping-progress">
          <span>{remaining ? `${remaining} to get` : 'Ready to put away'}</span>
          <span>
            {purchased} / {data.shopping.length}
          </span>
          <progress aria-label="Shopping completed" max={data.shopping.length} value={purchased} />
        </div>
      )}
      {matches.map((item) => (
        <ShoppingRow
          key={item.id}
          item={item}
          busy={busy}
          food={data.foods.find((food) => food.id === item.foodId)}
          have={item.foodId ? countFood(data, item.foodId) : 0}
          onEdit={onEdit}
          onPurchase={(checked) =>
            void run(() =>
              dispatch({ type: 'shopping.purchase', itemId: item.id, purchased: checked }),
            )
          }
        />
      ))}
      {!!data.shopping.length && !matches.length && (
        <p className="empty-message">No matching items.</p>
      )}
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
