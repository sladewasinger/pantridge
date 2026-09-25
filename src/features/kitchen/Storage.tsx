import { useKitchen } from '../../data/store';
import type { Food } from '../../domain/model';
import type { StoragePage } from '../../app/navigation';
import { stockedFoods } from '../../domain/selectors';
import { FoodTile } from './FoodTile';
import { Doors } from './Doors';
import { Plus } from 'lucide-react';
export function Storage({
  location,
  onSelect,
  onAdd,
}: {
  location: StoragePage;
  onSelect: (food: Food) => void;
  onAdd: () => void;
}) {
  const { data } = useKitchen();
  const foods = stockedFoods(data)
    .filter((food) =>
      location === 'freezer'
        ? food.location === 'fridge' && food.frozen
        : food.location === location && (location === 'pantry' || !food.frozen),
    )
    .sort((a, b) => a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
  return (
    <div className={'interior ' + location}>
      {location === 'freezer' && <div className="icicles" aria-hidden="true" />}
      {Array.from({ length: Math.max(1, Math.ceil(foods.length / 3)) }, (_, row) => (
        <div key={row} className="shelf" data-shelf={row} aria-label={'Row ' + (row + 1)}>
          {foods.slice(row * 3, row * 3 + 3).map((food) => (
            <FoodTile key={food.id} food={food} data={data} onSelect={onSelect} />
          ))}
          {!foods.length && (
            <button className="empty-shelf" onClick={onAdd} aria-label={'Add food to ' + location}>
              <Plus size={18} strokeWidth={1.4} />
              <span>Empty</span>
            </button>
          )}
        </div>
      ))}
      <Doors location={location} />
    </div>
  );
}
