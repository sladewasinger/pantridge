import { useState } from 'react';
import type { StoragePage } from '../../app/navigation';
import { dispatch, getKitchen } from '../../data/store';
import type { Lookup } from '../../domain/products/lookup';
import type { Food } from '../../domain/model';
import { newFood } from '../../domain/selectors';
import { matchVariant, packageLabel } from '../../domain/products/variants';
import { sizeLabel } from '../../domain/products/size';
import { FoodFields } from '../food/FoodFields';
import { Quantity } from '../../ui/Quantity';
import { useAction } from '../../ui/useAction';
import { showUndo } from '../../ui/notice';
import { requireScanAccount } from './client';

export function ScanConfirm({
  result,
  account,
  location,
  onDone,
}: {
  result: Lookup;
  account: string;
  location: StoragePage | null;
  onDone: () => void;
}) {
  const [food, setFood] = useState<Food>(() => {
    const place = location ?? result.suggestion.location;
    return {
      ...newFood(),
      ...result.suggestion,
      name: result.found ? result.suggestion.name : '',
      location: place === 'pantry' ? ('pantry' as const) : ('fridge' as const),
      frozen: place === 'freezer',
      size: result.size,
      packageSize: sizeLabel(result.size),
      brand: result.product.brand,
    };
  });
  const [quantity, setQuantity] = useState(1);
  const [expires, setExpires] = useState('');
  const [unspecified, setUnspecified] = useState(false);
  const { run, error, busy } = useAction();
  const match = matchVariant(getKitchen().data, food);
  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void run(async () => {
          requireScanAccount(account);
          if (!packageLabel(food) && !unspecified)
            throw new Error('Enter a size or choose Unspecified.');
          const stockId = crypto.randomUUID();
          await dispatch({
            type: 'stock.scan',
            food: { ...food, brand: '' },
            stock: {
              id: stockId,
              foodId: food.id,
              quantity,
              ...(expires ? { expires } : {}),
              product: { ...result.product, brand: food.brand },
            },
          });
          requireScanAccount(account);
          showUndo(`${quantity} added · ${food.name}`, async () => {
            requireScanAccount(account);
            await dispatch({ type: 'stock.adjust', stockId, delta: -quantity });
          });
          onDone();
        });
      }}
    >
      <div className="scan-product">
        <img src={`/art/${food.art}.svg`} alt="" />
        <span>
          {result.product.name || 'Product not found'}
          <small>{result.product.brand}</small>
        </span>
      </div>
      {result.packageText && !result.size && (
        <p className="muted">Package label: {result.packageText}</p>
      )}
      <FoodFields food={food} onChange={setFood} compact />
      {!packageLabel(food) && (
        <label className="scan-unspecified">
          <input
            type="checkbox"
            checked={unspecified}
            onChange={(e) => setUnspecified(e.target.checked)}
          />
          Unspecified size
        </label>
      )}
      <Quantity value={quantity} onChange={setQuantity} min={1} />
      <label>
        Expiration <span className="optional">optional</span>
        <input type="date" value={expires} onChange={(e) => setExpires(e.target.value)} />
      </label>
      {match && (
        <p className="muted">
          Adds to your existing {match.name} · {packageLabel(match) || 'Unspecified'}
        </p>
      )}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      <button className="primary full" disabled={busy}>
        Add to {food.frozen ? 'freezer' : food.location}
      </button>
      <button className="text-button full" type="button" disabled={busy} onClick={onDone}>
        Cancel scan
      </button>
      {result.source === 'openfoodfacts' && (
        <p className="scan-attribution">
          Product data:{' '}
          <a
            href={`https://world.openfoodfacts.org/product/${result.product.barcode}`}
            target="_blank"
            rel="noreferrer"
          >
            Open Food Facts
          </a>{' '}
          · ODbL
        </p>
      )}
    </form>
  );
}
