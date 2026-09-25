import { useEffect, useRef, useState } from 'react';
import { dispatch, getAccount, getKitchen } from '../../data/store';
import type { Food } from '../../domain/model';
import type { NutritionEstimate } from '../../domain/products/nutrition-estimate';
import { requestNutrition } from './estimate-client';
import { useAction } from '../../ui/useAction';
import { showUndo } from '../../ui/notice';

export function useNutritionEstimate(food: Food) {
  const [account] = useState(getAccount);
  const [details, setDetails] = useState(food.nutritionEstimate?.details ?? '');
  const [preview, setPreview] = useState<NutritionEstimate | null>(null);
  const controller = useRef<AbortController | null>(null);
  const { run, error, busy } = useAction();
  useEffect(() => () => controller.current?.abort(), []);
  async function estimate() {
    await run(async () => {
      controller.current?.abort();
      const request = new AbortController();
      controller.current = request;
      try {
        const result = await requestNutrition(
          { kind: 'nutrition', name: food.name, details: details.trim() },
          account,
          request.signal,
        );
        if (!result) throw new Error('No useful estimate found. Add details and try again.');
        setPreview(result);
      } catch (cause) {
        if (!request.signal.aborted) throw cause;
      }
    });
  }
  async function save(value: NutritionEstimate | null) {
    await run(async () => {
      const current = getKitchen().data.foods.find((item) => item.id === food.id);
      if (getAccount() !== account || !current || current.name !== food.name)
        throw new Error('This food changed. Reopen it before saving.');
      await dispatch({ type: 'food.nutrition', foodId: food.id, name: food.name, estimate: value });
      const previous = current.nutritionEstimate;
      if (!value && previous)
        showUndo('Estimate removed', async () => {
          if (getAccount() !== account)
            throw new Error('Your account changed. Reopen this kitchen.');
          await dispatch({
            type: 'food.nutrition',
            foodId: food.id,
            name: food.name,
            estimate: previous,
          });
        });
      setPreview(null);
    });
  }
  return {
    account,
    details,
    setDetails,
    preview,
    clear: () => setPreview(null),
    estimate,
    save,
    busy,
    error,
  };
}
