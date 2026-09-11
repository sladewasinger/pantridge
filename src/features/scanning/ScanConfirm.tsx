import { artPath } from '../../domain/artwork/catalog';
import { useState } from 'react';
import type { StoragePage } from '../../app/navigation';
import { dispatch, getKitchen } from '../../data/store';
import type { Lookup } from '../../domain/products/lookup';
import { matchVariant, packageLabel } from '../../domain/products/variants';
import { useScanDraft } from './useScanDraft';
import { useExpiration } from '../food/useExpiration';
import { ExpirationField } from '../food/ExpirationField';
import { ItemTabs } from '../nutrition/ItemTabs';
import { Sparkles, LoaderCircle } from 'lucide-react';
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
  const { food, edit: setFood, touch, refined, refining } = useScanDraft(result, account, location);
  const [quantity, setQuantity] = useState(1);
  const expiry = useExpiration(food, refined.suggestion.estimatedDays);
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
              ...expiry.fields,
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
        <img src={artPath(food.art)} alt="" />
        <span>
          {food.name || 'Product not found'}
          {refining && (
            <span className="scan-refining" role="status">
              <Sparkles size={15} />
              <LoaderCircle size={14} />
              <span className="sr-only">Refining details</span>
            </span>
          )}
          <small>
            {packageLabel(food) || 'Unspecified size'} · {food.unit}
          </small>
          <small>{result.product.brand}</small>
        </span>
      </div>
      <ItemTabs products={[result.product]}>
        {result.packageText && !result.size && (
          <p className="muted">Package label: {result.packageText}</p>
        )}
        <Quantity value={quantity} onChange={setQuantity} min={1} />
        <div className="scan-placement" role="group" aria-label="Storage location">
          {(['pantry', 'fridge', 'freezer', 'unspecified'] as const).map((place) => (
            <button
              key={place}
              type="button"
              aria-pressed={(food.frozen ? 'freezer' : food.location) === place}
              onClick={() => {
                touch('location');
                setFood({
                  ...food,
                  location: place === 'freezer' ? 'fridge' : place,
                  frozen: place === 'freezer',
                });
              }}
            >
              {place.charAt(0).toUpperCase() + place.slice(1)}
            </button>
          ))}
        </div>
        <details open={!result.found || !result.size} className="scan-details">
          <summary>Edit details</summary>
          <FoodFields food={food} onChange={setFood} onEdit={touch} compact />
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
        </details>
        <ExpirationField value={expiry.value} source={expiry.source} onChange={expiry.set} />
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
      </ItemTabs>
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
