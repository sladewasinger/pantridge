import { artPath } from '../../domain/artwork/catalog';
import type { Food, Snapshot } from '../../domain/model';
import type { PointerEvent } from 'react';
import { countFood, foodLots, units } from '../../domain/selectors';
import { expirationBadge } from '../../domain/expiration';
import { Clock3 } from 'lucide-react';
import { packageLabel } from '../../domain/products/variants';
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
  const firstLot = foodLots(data, food.id)[0];
  const expires = firstLot?.expires;
  const badge = expires ? expirationBadge(expires) : null;
  return (
    <button
      className="food-tile"
      onClick={() => onSelect(food)}
      onPointerDown={(event) => onDragStart(event, food)}
      onContextMenu={(event) => event.preventDefault()}
      aria-label={`${food.name}${packageLabel(food) ? `, ${packageLabel(food)}` : ''}, ${amount}`}
    >
      <img src={artPath(food.art)} alt="" draggable="false" />
      <span className="food-label">
        {food.name}
        {packageLabel(food) && <span className="size-label">{packageLabel(food)}</span>}
        <small>{amount}</small>
      </span>
      {badge && (
        <span
          className={`expiration ${badge.tone}`}
          role="img"
          aria-label={`${firstLot?.expirySource ? 'Estimated reminder' : 'Expiration'}: ${badge.label}`}
        >
          <Clock3 size={11} />
          {firstLot?.expirySource ? `~ ${badge.label.replace('Past date', 'Review')}` : badge.label}
        </span>
      )}
    </button>
  );
}
