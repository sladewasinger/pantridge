import { useKitchen } from '../../data/store';
import { stockedFoods } from '../../domain/selectors';
import type { Location } from '../../domain/model';

export function Kitchen({ onOpen }: { onOpen: (location: Location) => void }) {
  const { data } = useKitchen();
  return (
    <div className="kitchen-scene">
      <img
        className="scene-art"
        src="/art/kitchen.svg"
        alt="A warm kitchen with a fridge and wooden pantry"
      />
      {(['fridge', 'pantry'] as const).map((location) => {
        const count = stockedFoods(data).filter((food) => food.location === location).length;
        return (
          <button
            key={location}
            className={`appliance ${location}-button`}
            onClick={() => onOpen(location)}
            aria-label={`Open ${location}`}
          >
            <img src={`/art/${location}.svg`} alt="" />
            <span className="appliance-label">
              {location === 'fridge' ? 'Fridge' : 'Pantry'}
              <small>
                {count} {count === 1 ? 'item' : 'items'}
              </small>
            </span>
          </button>
        );
      })}
    </div>
  );
}
