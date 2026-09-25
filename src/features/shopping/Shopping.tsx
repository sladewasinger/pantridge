import { dispatch, useKitchen } from '../../data/store';
import type { ShoppingItem } from '../../domain/model';
import { countFood } from '../../domain/selectors';
import { useAction } from '../../ui/useAction';
import { ShoppingRow } from './ShoppingRow';
import { DiscardChecked } from './DiscardChecked';
import { useShoppingReorder } from './useShoppingReorder';

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
  const { root, ...reorder } = useShoppingReorder(matches);
  return (
    <div className={`shopping-list${reorder.dragId ? ' is-reordering' : ''}`} ref={root}>
      {reorder.dragId && <div className="shopping-drop-gap" aria-hidden="true" />}
      <p id={reorder.instructions} className="sr-only">
        Drag to reorder. With a keyboard, use Up or Down, Home or End.
      </p>
      <span className="sr-only" role="status">
        {reorder.message}
      </span>
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
      {reorder.items.map((item) => (
        <ShoppingRow
          key={item.id}
          item={item}
          busy={busy || reorder.busy}
          reorder={reorder}
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
        <>
          <button className="primary full put-away" onClick={onPutAway}>
            Put groceries away <span className="count-pill">{purchased}</span>
          </button>
          <DiscardChecked />
        </>
      )}
      {(error || reorder.error) && (
        <p className="error" role="alert">
          {error || reorder.error}
        </p>
      )}
    </div>
  );
}
