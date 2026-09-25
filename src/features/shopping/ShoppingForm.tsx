import { useId, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { dispatch, useKitchen } from '../../data/store';
import { unitSchema, type ShoppingItem } from '../../domain/model';
import { Modal } from '../../ui/Modal';
import { Quantity } from '../../ui/Quantity';
import { useAction } from '../../ui/useAction';
import { packageLabel } from '../../domain/products/variants';
import { shoppingSuggestions } from '../../domain/shopping-suggestions';
import { ShoppingSuggestions } from './ShoppingSuggestions';
import { OtherSizes } from './OtherSizes';
import { ShoppingArtwork } from './ShoppingArtwork';

export function ShoppingForm({ item, onClose }: { item?: ShoppingItem; onClose: () => void }) {
  const formId = useId();
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
  const suggestions = shoppingSuggestions(data, draft.name);
  function setName(name: string) {
    const { foodId: _foodId, ...rest } = draft;
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
    <Modal
      title={item ? 'Edit shopping item' : 'Add to your list'}
      onClose={onClose}
      placement="top"
      footer={
        <button type="submit" form={formId} className="primary full" disabled={busy}>
          {item ? 'Save changes' : 'Add to list'}
        </button>
      }
    >
      <form
        id={formId}
        className="shopping-form"
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
        {!draft.foodId && (
          <ShoppingSuggestions
            foods={suggestions}
            onSelect={(food) =>
              setDraft({
                ...draft,
                name: food.name,
                unit: food.unit,
                foodId: food.id,
                packageSize: packageLabel(food),
              })
            }
          />
        )}
        {draft.foodId && (
          <p className="linked-note">
            Linked to your kitchen inventory · {draft.packageSize || 'Unspecified size'}
          </p>
        )}
        <Quantity
          value={draft.quantity}
          min={1}
          onChange={(quantity) => setDraft({ ...draft, quantity })}
        />
        <div className="form-grid">
          <label>
            Size <span className="optional">each</span>
            <input
              aria-label="Package size"
              maxLength={80}
              placeholder="e.g. 3 lb"
              value={draft.packageSize ?? ''}
              onChange={(event) => {
                const { foodId: _foodId, ...rest } = draft;
                setDraft({ ...rest, packageSize: event.target.value });
              }}
            />
          </label>
          <label>
            Package
            <select
              value={draft.unit}
              disabled={!!draft.foodId}
              onChange={(e) => setDraft({ ...draft, unit: unitSchema.parse(e.target.value) })}
            >
              {unitSchema.options.map((unit) => (
                <option key={unit} value={unit}>
                  {unit === 'items' ? 'None' : unit}
                </option>
              ))}
            </select>
          </label>
        </div>
        <ShoppingArtwork
          item={draft}
          food={data.foods.find((food) => food.id === draft.foodId)}
          onChange={setDraft}
        />
        <OtherSizes data={data} food={data.foods.find((food) => food.id === draft.foodId)} />
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
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
