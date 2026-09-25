import type { Food } from '../../domain/model';
import { artPath } from '../../domain/artwork/catalog';
import { packageLabel } from '../../domain/products/variants';

export function ShoppingSuggestions({
  foods,
  onSelect,
}: {
  foods: Food[];
  onSelect: (food: Food) => void;
}) {
  return (
    <div className="suggestions shopping-suggestions" role="group" aria-label="Remembered foods">
      {foods.map((food) => (
        <button type="button" key={food.id} onClick={() => onSelect(food)}>
          <img src={artPath(food.art)} alt="" />
          <span>
            {food.name}
            <small>{packageLabel(food)}</small>
          </span>
        </button>
      ))}
    </div>
  );
}
