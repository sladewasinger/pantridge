import { useState } from 'react';
import { dispatch, useKitchen } from '../../data/store';
import type { ShoppingItem } from '../../domain/model';
import { newFood, units } from '../../domain/selectors';
import { Modal } from '../../ui/Modal';
import { useAction } from '../../ui/useAction';
import { FoodFields } from '../food/FoodFields';

export function PutAway({ onClose }: { onClose: () => void }) {
  const { data } = useKitchen();
  const purchased = data.shopping.filter((item) => item.purchased);
  const item = purchased[0];
  return (
    <Modal title="Put groceries away" onClose={onClose}>
      {item ? (
        <PutAwayItem key={item.id} item={item} count={purchased.length} />
      ) : (
        <div className="empty-state">
          <h3>Everything in its place.</h3>
          <p>Your shelves are up to date.</p>
          <button className="primary full" onClick={onClose}>
            Back to my kitchen
          </button>
        </div>
      )}
    </Modal>
  );
}
function PutAwayItem({ item, count }: { item: ShoppingItem; count: number }) {
  const { data } = useKitchen();
  const existing = data.foods.find((food) => food.id === item.foodId);
  const [food, setFood] = useState(
    () =>
      existing ?? { ...newFood(item.name), unit: item.unit, packageSize: item.packageSize ?? '' },
  );
  const [expires, setExpires] = useState('');
  const { run, error, busy } = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(async () => {
          await dispatch({
            type: 'shopping.putAway',
            itemId: item.id,
            food,
            stock: {
              id: crypto.randomUUID(),
              foodId: food.id,
              quantity: item.quantity,
              ...(expires ? { expires } : {}),
            },
          });
        });
      }}
    >
      <p className="muted">
        {count} to put away · {units(item.quantity, item.unit)}
      </p>
      <FoodFields food={food} onChange={setFood} identity={!existing} />
      <label>
        Expiration <span className="optional">optional</span>
        <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      </label>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <button className="primary full" disabled={busy}>
        Put in {food.frozen ? 'freezer' : food.location}
      </button>
      <button
        className="text-button full"
        type="button"
        disabled={busy}
        onClick={() => void run(() => dispatch({ type: 'shopping.remove', itemId: item.id }))}
      >
        Finish without tracking this item
      </button>
    </form>
  );
}
