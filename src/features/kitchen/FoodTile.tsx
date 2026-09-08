import type { Food, Snapshot } from '../../domain/model';
import type { PointerEvent } from 'react';
import { countFood, foodLots, units } from '../../domain/selectors';
import { expirationBadge } from '../../domain/expiration';
import { Clock3 } from 'lucide-react';
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
  const badge = expires ? expirationBadge(expires) : null;
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
      {badge && (
        <span className={`expiration ${badge.tone}`} aria-label={`Expiration: ${badge.label}`}>
          <Clock3 size={11} />
          {badge.label}
        </span>
      )}
    </button>
  );
}
