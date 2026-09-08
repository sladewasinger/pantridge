import { useState } from 'react';
import { Snowflake } from 'lucide-react';
import { useKitchen } from '../../data/store';
import type { Food, Location } from '../../domain/model';
import { stockedFoods } from '../../domain/selectors';
import { FoodTile } from './FoodTile';
import { useShelfDrag } from './useShelfDrag';

export function Storage({
  location,
  onSelect,
}: {
  location: Location;
  onSelect: (food: Food) => void;
}) {
  const { data } = useKitchen();
  const { root, move, finish, cancel, click, target, start, message, error } = useShelfDrag();
  const [frozen, setFrozen] = useState(false);
  const foods = stockedFoods(data).filter(
    (food) => food.location === location && (location === 'pantry' || food.frozen === frozen),
  );
  const frozenCount = stockedFoods(data).filter(
    (food) => food.location === 'fridge' && food.frozen,
  ).length;
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
      {location === 'fridge' && (
        <button className="freezer-tab" aria-pressed={frozen} onClick={() => setFrozen(!frozen)}>
          <Snowflake size={16} />
          {frozen ? 'Back to fridge' : `Frozen · ${frozenCount}`}
        </button>
      )}
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
            <span className="empty-shelf">Empty</span>
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
      {location === 'pantry' ? (
        <>
          <div className="swing-door door-left" aria-hidden="true" />
          <div className="swing-door door-right" aria-hidden="true" />
        </>
      ) : (
        <div className="swing-door" aria-hidden="true" />
      )}
    </div>
  );
}
