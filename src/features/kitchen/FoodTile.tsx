import type { Food, Snapshot } from '../../domain/model';
import type { PointerEvent } from 'react';
import { countFood, dateLabel, foodLots, units } from '../../domain/selectors';
export function FoodTile({
  food,
  data,
  onSelect,
  onDragStart,
}: {
  food: Food;
  data: Snapshot;
  onSelect: (food: Food) => void;
  onDragStart: (event: PointerEvent<HTMLButtonElement>, food: Food) => void;
}) {
  const amount = units(countFood(data, food.id), food.unit);
  const expires = foodLots(data, food.id)[0]?.expires;
  return (
    <button
      className="food-tile"
      onClick={() => onSelect(food)}
      onPointerDown={(event) => onDragStart(event, food)}
      aria-label={`${food.name}, ${amount}`}
    >
      <img src={`/art/${food.art}.svg`} alt="" draggable="false" />
      <span className="food-label">
        {food.name}
        <small>{amount}</small>
      </span>
      {expires && <span className="expiration">Use by {dateLabel(expires)}</span>}
    </button>
  );
}
