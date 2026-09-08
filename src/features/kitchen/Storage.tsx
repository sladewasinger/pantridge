import { useKitchen } from '../../data/store';
import type { Food } from '../../domain/model';
import type { StoragePage } from '../../app/navigation';
import { stockedFoods } from '../../domain/selectors';
import { FoodTile } from './FoodTile';
import { useShelfDrag } from './useShelfDrag';
import { Doors } from './Doors';
import { Plus } from 'lucide-react';

export function Storage({
  location,
  onSelect,
  onAdd,
}: {
  location: StoragePage;
  onSelect: (food: Food) => void;
  onAdd: (shelf: number) => void;
}) {
  const { data } = useKitchen();
  const { root, move, finish, cancel, click, target, start, message, error } = useShelfDrag();
  const foods = stockedFoods(data).filter((food) =>
    location === 'freezer'
      ? food.location === 'fridge' && food.frozen
      : food.location === location && (location === 'pantry' || !food.frozen),
  );
  return (
    <div
      ref={root}
      className={`interior ${location}`}
      onPointerMove={move}
      onPointerUp={(event) => void finish(event)}
      onPointerCancel={cancel}
      onLostPointerCapture={cancel}
      onClickCapture={click}
    >
      {location === 'freezer' && <div className="icicles" aria-hidden="true" />}
      {[0, 1, 2].map((shelf) => (
        <div
          key={shelf}
          className={`shelf${target === shelf ? ' drop-target' : ''}`}
          data-shelf={shelf}
          aria-label={`${['Top', 'Middle', 'Bottom'][shelf]} shelf`}
        >
          {foods
            .filter((food) => food.shelf === shelf)
            .map((food) => (
              <FoodTile
                key={food.id}
                food={food}
                data={data}
                onSelect={onSelect}
                onDragStart={start}
              />
            ))}
          {!foods.some((food) => food.shelf === shelf) && (
            <button
              className="empty-shelf"
              onClick={() => onAdd(shelf)}
              aria-label={`Add food to ${['top', 'middle', 'bottom'][shelf]} shelf`}
            >
              <Plus size={18} strokeWidth={1.4} />
              <span>Empty</span>
            </button>
          )}
        </div>
      ))}
      <span className="sr-only" role="status">
        {message}
      </span>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      <Doors location={location} />
    </div>
  );
}
