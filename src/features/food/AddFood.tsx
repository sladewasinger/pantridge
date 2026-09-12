import { useState } from 'react';
import { dispatchMany } from '../../data/store';
import { newFood } from '../../domain/selectors';
import type { StoragePage } from '../../app/navigation';
import { Modal } from '../../ui/Modal';
import { Quantity } from '../../ui/Quantity';
import { useAction } from '../../ui/useAction';
import { FoodFields } from './FoodFields';
import { useExpiration } from './useExpiration';
import { ExpirationField } from './ExpirationField';
export function AddFood({
  location,
  shelf = 0,
  onClose,
}: {
  location: StoragePage;
  shelf?: number;
  onClose: () => void;
}) {
  const [food, setFood] = useState(() => ({
    ...newFood(),
    location: location === 'freezer' ? ('fridge' as const) : location,
    frozen: location === 'freezer',
    shelf,
  }));
  const [quantity, setQuantity] = useState(1);
  const expiry = useExpiration(food);
  const { run, busy, error } = useAction();
  return (
    <Modal title="Add to your kitchen" onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void run(async () => {
            await dispatchMany([
              { type: 'food.save', food },
              {
                type: 'stock.add',
                stock: {
                  id: crypto.randomUUID(),
                  foodId: food.id,
                  quantity,
                  ...expiry.fields,
                },
              },
            ]);
            onClose();
          });
        }}
      >
        <FoodFields
          food={food}
          onChange={setFood}
          autoArtwork
          quantityControl={<Quantity value={quantity} onChange={setQuantity} min={1} />}
        />
        <ExpirationField value={expiry.value} source={expiry.source} onChange={expiry.set} />
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          Add to {food.frozen ? 'freezer' : food.location}
        </button>
      </form>
    </Modal>
  );
}
