import { useEffect, useRef, useState } from 'react';
import type { StoragePage } from '../../app/navigation';
import type { Food } from '../../domain/model';
import type { Lookup } from '../../domain/products/lookup';
import { matchVariant, rememberedProduct } from '../../domain/products/variants';
import { getAccount, getKitchen } from '../../data/store';
import { mergeScanDraft, pendingScan, scanDraft } from './draft';
import { lookupFlow } from './lookupFlow';

export function useScanDraft(barcode: string, account: string, location: StoragePage | null) {
  const [result, setResult] = useState(() => pendingScan(barcode));
  const [food, setFood] = useState(() => scanDraft(getKitchen().data, result, location));
  const [stage, setStage] = useState<'lookup' | 'enhance' | 'complete'>('lookup');
  const [lookupError, setLookupError] = useState('');
  const dirty = useRef(new Set<keyof Food>());
  const known = useRef(false);
  useEffect(() => {
    const controller = new AbortController();
    function receive(next: Lookup, refined: boolean) {
      if (getAccount() !== account) return;
      setResult(next);
      if (refined && known.current) return;
      const data = getKitchen().data;
      const suggestion = scanDraft(data, next, location);
      if (!refined)
        known.current = !!rememberedProduct(data, barcode) || !!matchVariant(data, suggestion);
      setFood((current) => mergeScanDraft(current, suggestion, dirty.current, refined));
    }
    void lookupFlow(barcode, account, controller.signal, {
      receive,
      progress: setStage,
      failure: setLookupError,
    });
    return () => controller.abort();
  }, [account, barcode, location]);
  function touch(...keys: (keyof Food)[]) {
    for (const key of keys) dirty.current.add(key);
    if (keys.includes('location') || keys.includes('frozen')) {
      dirty.current.add('location');
      dirty.current.add('frozen');
    }
    if (keys.includes('size') || keys.includes('packageSize')) {
      dirty.current.add('size');
      dirty.current.add('packageSize');
    }
  }
  function edit(next: Food) {
    for (const key of Object.keys(next) as (keyof Food)[])
      if (JSON.stringify(next[key]) !== JSON.stringify(food[key])) touch(key);
    setFood(next);
  }
  return { food, edit, touch, result, stage, lookupError };
}
