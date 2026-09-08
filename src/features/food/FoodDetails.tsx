import { useState } from 'react';
import { Minus, Plus, ShoppingBasket, Trash2 } from 'lucide-react';
import { dispatch, dispatchMany, useKitchen } from '../../data/store';
import type { Food, Stock } from '../../domain/model';
import { countFood, units } from '../../domain/selectors';
import { Modal } from '../../ui/Modal';
import { useAction } from '../../ui/useAction';
import { FoodFields } from './FoodFields';
import { showUndo } from '../../ui/notice';

export function FoodDetails({ foodId, onClose }: { foodId: string; onClose: () => void }) {
  const { data } = useKitchen();
  const current = data.foods.find((food) => food.id === foodId);
  const [editing, setEditing] = useState(false);
  const { run, error, busy } = useAction();
  if (!current) return null;
  const food = current;
  const lots = data.stock.filter((stock) => stock.foodId === foodId);
  const adjust = (stock: Stock, delta: number) =>
    void run(() => dispatch({ type: 'stock.adjust', stockId: stock.id, delta }));
  return (
    <Modal title={food.name} onClose={onClose}>
      <div className="food-overview">
        <img src={`/art/${food.art}.svg`} alt="" />
        <span>
          {units(countFood(data, foodId), food.unit)}
          <small>
            {food.brand} {food.packageSize}
          </small>
        </span>
      </div>
      {lots.map((stock) => (
        <div className="lot" key={stock.id}>
          <div className="lot-quantity">
            <button
              className="round"
              aria-label="Use one"
              disabled={busy || stock.quantity === 0}
              onClick={() => adjust(stock, -1)}
            >
              <Minus />
            </button>
            <span>{units(stock.quantity, food.unit)}</span>
            <button
              className="round"
              aria-label="Add one"
              disabled={busy || stock.quantity >= 9999}
              onClick={() => adjust(stock, 1)}
            >
              <Plus />
            </button>
          </div>
          <label>
            Expiration
            <input
              type="date"
              aria-label={`Expiration for lot ${stock.id}`}
              value={stock.expires ?? ''}
              onChange={(e) =>
                void run(() =>
                  dispatch({
                    type: 'stock.date',
                    stockId: stock.id,
                    expires: e.target.value || null,
                  }),
                )
              }
            />
          </label>
        </div>
      ))}
      <button
        className="secondary full"
        disabled={busy}
        onClick={() =>
          void run(() =>
            dispatch({
              type: 'stock.add',
              stock: { id: crypto.randomUUID(), foodId, quantity: 1 },
            }),
          )
        }
      >
        Add a separate package
      </button>
      {countFood(data, foodId) === 0 && (
        <p className="muted">
          Off the shelf, still remembered. Add it to your list whenever you need it.
        </p>
      )}
      <button
        className="primary full"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            const existing = data.shopping.find(
              (item) => item.foodId === foodId && !item.purchased,
            );
            await dispatch({
              type: 'shopping.save',
              item: existing
                ? { ...existing, quantity: existing.quantity + 1 }
                : {
                    id: crypto.randomUUID(),
                    foodId,
                    name: food.name,
                    unit: food.unit,
                    quantity: 1,
                    purchased: false,
                  },
            });
            onClose();
          })
        }
      >
        <ShoppingBasket size={18} />
        Add to shopping list
      </button>
      <button className="text-button full" onClick={() => setEditing(!editing)}>
        {editing ? 'Cancel editing' : 'Move or edit item'}
      </button>
      {editing && (
        <EditFood
          food={food}
          onSave={async (next) => {
            await dispatch({ type: 'food.save', food: next });
            setEditing(false);
          }}
        />
      )}
      {editing && (
        <button
          className="text-button danger full"
          disabled={busy}
          onClick={() =>
            void run(async () => {
              await dispatch({ type: 'food.remove', foodId });
              showUndo(`${food.name} deleted`, () =>
                dispatchMany([
                  { type: 'food.restore', food },
                  ...lots.map((stock) => ({ type: 'stock.add' as const, stock })),
                ]),
              );
              onClose();
            })
          }
        >
          <Trash2 size={16} />
          Delete food
        </button>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
    </Modal>
  );
}

function EditFood({ food, onSave }: { food: Food; onSave: (food: Food) => Promise<void> }) {
  const [draft, setDraft] = useState(food);
  const { run, error, busy } = useAction();
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run(() => onSave(draft));
      }}
    >
      <FoodFields food={draft} onChange={setDraft} />
      {draft.unit !== food.unit && (
        <p className="muted">Counts stay the same; only the unit changes.</p>
      )}
      <button className="secondary full" disabled={busy}>
        Save changes
      </button>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </form>
  );
}
