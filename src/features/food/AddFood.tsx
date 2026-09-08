import { useState } from 'react';
import { dispatchMany } from '../../data/store';
import { newFood } from '../../domain/selectors';
import type { Location } from '../../domain/model';
import { Modal } from '../../ui/Modal';
import { Quantity } from '../../ui/Quantity';
import { useAction } from '../../ui/useAction';
import { FoodFields } from './FoodFields';
export function AddFood({ location, onClose }: { location: Location; onClose: () => void }) {
  const [food, setFood] = useState(() => ({ ...newFood(), location }));
  const [quantity, setQuantity] = useState(1);
  const [expires, setExpires] = useState('');
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
                  ...(expires ? { expires } : {}),
                },
              },
            ]);
            onClose();
          });
        }}
      >
        <FoodFields food={food} onChange={setFood} />
        <Quantity value={quantity} onChange={setQuantity} min={1} />
        <label>
          Expiration <span className="optional">optional</span>
          <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
        </label>
        {error && (
          <p role="alert" className="error">
            {error}
          </p>
        )}
        <button className="primary full" disabled={busy}>
          Add to {food.location}
        </button>
      </form>
    </Modal>
  );
}
