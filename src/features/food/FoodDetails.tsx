import { artPath } from '../../domain/artwork/catalog';
import { useState } from 'react';
import { ShoppingBasket, Trash2 } from 'lucide-react';
import { dispatch, dispatchMany, useKitchen } from '../../data/store';
import type { Food } from '../../domain/model';
import { countFood, units } from '../../domain/selectors';
import { Modal } from '../../ui/Modal';
import { useAction } from '../../ui/useAction';
import { FoodFields } from './FoodFields';
import { showUndo } from '../../ui/notice';
import { ItemTabs } from '../nutrition/ItemTabs';
import { StockLot } from './StockLot';
import { UndoNotice } from '../../ui/UndoNotice';
import { estimatedDate } from '../../domain/freshness/estimate';
import { parseSize } from '../../domain/products/size';

export function FoodDetails({ foodId, onClose }: { foodId: string; onClose: () => void }) {
  const { data } = useKitchen();
  const current = data.foods.find((food) => food.id === foodId);
  const [editing, setEditing] = useState(false);
  const { run, error, busy } = useAction();
  if (!current) return null;
  const food = current;
  const lots = data.stock.filter((stock) => stock.foodId === foodId);
  return (
    <Modal title={food.name} onClose={onClose}>
      <ItemTabs
        products={lots.flatMap((lot) => (lot.product ? [lot.product] : []))}
        size={food.size ?? parseSize(food.packageSize)}
      >
        <div className="food-overview">
          <img src={artPath(food.art)} alt="" />
          <span>
            {units(countFood(data, foodId), food.unit)}
            <small>
              {food.brand} {food.packageSize}
            </small>
          </span>
        </div>
        {lots.map((stock, index) => (
          <StockLot
            key={stock.id}
            stock={stock}
            unit={food.unit}
            index={index}
            busy={busy}
            onChange={(command) => void run(() => dispatch(command))}
            onRemove={() =>
              void run(async () => {
                await dispatch({ type: 'stock.remove', stockId: stock.id });
                showUndo('Package deleted', () => dispatch({ type: 'stock.add', stock }));
              })
            }
          />
        ))}
        <button
          className="secondary full"
          disabled={busy}
          onClick={() =>
            void run(() =>
              dispatch({
                type: 'stock.add',
                stock: {
                  id: crypto.randomUUID(),
                  foodId,
                  quantity: 1,
                  ...estimatedDate(food, new Date()),
                },
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
      </ItemTabs>
      <UndoNotice />
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
