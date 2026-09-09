import type { Food, Snapshot } from '../../domain/model';
import { foodGroup, packageLabel } from '../../domain/products/variants';
import { countFood, units } from '../../domain/selectors';

export function OtherSizes({ data, food }: { data: Snapshot; food?: Food }) {
  if (!food) return null;
  const others = data.foods.filter(
    (item) =>
      item.id !== food.id &&
      foodGroup(item.name) === foodGroup(food.name) &&
      countFood(data, item.id) > 0,
  );
  if (!others.length) return null;
  return (
    <small className="other-sizes">
      Other sizes:{' '}
      {others
        .map(
          (item) =>
            `${packageLabel(item) || 'Unspecified'} · ${units(countFood(data, item.id), item.unit)}`,
        )
        .join('; ')}
    </small>
  );
}
