import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { dispatch, useKitchen } from '../../data/store';
import { unitSchema, type ShoppingItem } from '../../domain/model';
import { Modal } from '../../ui/Modal';
import { Quantity } from '../../ui/Quantity';
import { useAction } from '../../ui/useAction';
import { packageLabel } from '../../domain/products/variants';

export function ShoppingForm({ item, onClose }: { item?: ShoppingItem; onClose: () => void }) {
  const { data } = useKitchen();
  const current = item ? data.shopping.find((entry) => entry.id === item.id) : undefined;
  const [draft, setDraft] = useState<ShoppingItem>(
    () =>
      current ?? {
        id: crypto.randomUUID(),
        name: '',
        unit: 'items',
        quantity: 1,
        purchased: false,
      },
  );
  const { run, busy, error } = useAction();
  const suggestions = data.foods
    .filter((food) => food.name.toLowerCase().includes(draft.name.toLowerCase()))
    .slice(0, 6);
  function setName(name: string) {
    const { foodId: _foodId, packageSize: _size, ...rest } = draft;
    const exact = data.foods.filter(
      (food) => food.name.toLowerCase() === name.trim().toLowerCase(),
    );
    const match = exact.length === 1 ? exact[0] : undefined;
    setDraft(
      match
        ? { ...rest, name, foodId: match.id, unit: match.unit, packageSize: packageLabel(match) }
        : { ...rest, name },
    );
  }
  return (
    <Modal title={item ? 'Edit shopping item' : 'Add to your list'} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            if (item && !current)
              throw new Error('This item was removed. Close this sheet to continue.');
            await dispatch({ type: 'shopping.save', item: draft });
            onClose();
          });
        }}
      >
        <label>
          Item name
          <input
            required
            maxLength={80}
            value={draft.name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What do you need?"
          />
        </label>
        {!draft.foodId && suggestions.length > 0 && (
          <div className="suggestions" aria-label="Remembered foods">
            {suggestions.map((food) => (
              <button
                type="button"
                key={food.id}
                onClick={() =>
                  setDraft({
                    ...draft,
                    name: food.name,
                    unit: food.unit,
                    foodId: food.id,
                    packageSize: packageLabel(food),
                  })
                }
              >
                <img src={`/art/${food.art}.svg`} alt="" />
                {food.name}
                <small>{packageLabel(food) || 'Unspecified size'}</small>
              </button>
            ))}
          </div>
        )}
        {draft.foodId && (
          <p className="linked-note">
            Linked to your kitchen inventory · {draft.packageSize || 'Unspecified size'}
          </p>
        )}
        <label>
          Unit
          <select
            value={draft.unit}
            disabled={!!draft.foodId}
            onChange={(e) => setDraft({ ...draft, unit: unitSchema.parse(e.target.value) })}
          >
            {unitSchema.options.map((unit) => (
              <option key={unit}>{unit}</option>
            ))}
          </select>
        </label>
        <Quantity
          value={draft.quantity}
          min={1}
          onChange={(quantity) => setDraft({ ...draft, quantity })}
        />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          {item ? 'Save changes' : 'Add to list'}
        </button>
        {item && (
          <button
            type="button"
            className="text-button danger full"
            disabled={busy}
            onClick={() =>
              void run(async () => {
                await dispatch({ type: 'shopping.remove', itemId: item.id });
                onClose();
              })
            }
          >
            <Trash2 size={16} />
            Remove from list
          </button>
        )}
      </form>
    </Modal>
  );
}
