import { useEffect, useRef, useState } from 'react';
import type { StoragePage } from '../../app/navigation';
import type { Food } from '../../domain/model';
import type { Lookup } from '../../domain/products/lookup';
import { matchVariant, rememberedProduct } from '../../domain/products/variants';
import { getAccount, getKitchen } from '../../data/store';
import { scanDraft } from './draft';
import { refineBarcode } from './client';

export function useScanDraft(result: Lookup, account: string, location: StoragePage | null) {
  const [food, setFood] = useState(() => scanDraft(getKitchen().data, result, location));
  const [refined, setRefined] = useState(result);
  const [refining, setRefining] = useState(result.enhancement === 'pending');
  const dirty = useRef(new Set<keyof Food>());
  const known = useRef(
    !!rememberedProduct(getKitchen().data, result.product.barcode) ||
      !!matchVariant(getKitchen().data, food),
  );
  useEffect(() => {
    if (result.enhancement !== 'pending') return;
    const controller = new AbortController();
    void refineBarcode(result.product.barcode, account, controller.signal)
      .then((next) => {
        if (controller.signal.aborted || getAccount() !== account) return;
        setRefined(next);
        if (known.current) return;
        const suggestion = scanDraft(getKitchen().data, next, location);
        setFood((current) => {
          const merged = { ...current };
          for (const key of ['name', 'unit', 'art', 'location', 'frozen'] as const) {
            if (dirty.current.has(key)) continue;
            Object.assign(merged, { [key]: suggestion[key] });
          }
          return merged;
        });
      })
      .catch(() => {
        /* The initial result remains usable if optional refinement fails. */
      })
      .finally(() => {
        if (!controller.signal.aborted) setRefining(false);
      });
    return () => controller.abort();
  }, [account, location, result]);
  function touch(...keys: (keyof Food)[]) {
    for (const key of keys) dirty.current.add(key);
    if (keys.includes('location') || keys.includes('frozen')) {
      dirty.current.add('location');
      dirty.current.add('frozen');
    }
  }
  function edit(next: Food) {
    for (const key of Object.keys(next) as (keyof Food)[])
      if (JSON.stringify(next[key]) !== JSON.stringify(food[key])) touch(key);
    setFood(next);
  }
  return { food, edit, touch, refined, refining };
}
