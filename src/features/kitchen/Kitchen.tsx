import { useKitchen } from '../../data/store';
import { stockedFoods } from '../../domain/selectors';
import type { StoragePage } from '../../app/navigation';

export function Kitchen({ onOpen }: { onOpen: (location: StoragePage) => void }) {
  const { data } = useKitchen();
  const foods = stockedFoods(data);
  const count = (place: StoragePage) =>
    foods.filter((food) =>
      place === 'freezer'
        ? food.location === 'fridge' && food.frozen
        : food.location === place && (place === 'pantry' || !food.frozen),
    ).length;
  return (
    <div className="kitchen-scene">
      <img
        className="scene-art"
        src="/art/kitchen.svg"
        alt="A warm kitchen with a fridge and wooden pantry"
      />
      <div className="appliance fridge-appliance">
        <img src="/art/fridge.svg" alt="" />
        <button className="freezer-hit" onClick={() => onOpen('freezer')} aria-label="Open freezer">
          <span className="compartment-label">
            Freezer<small>{count('freezer')} items</small>
          </span>
        </button>
        <button className="fridge-hit" onClick={() => onOpen('fridge')} aria-label="Open fridge">
          <span className="compartment-label">
            Fridge<small>{count('fridge')} items</small>
          </span>
        </button>
      </div>
      <button
        className="appliance pantry-button"
        onClick={() => onOpen('pantry')}
        aria-label="Open pantry"
      >
        <img src="/art/pantry.svg" alt="" />
        <span className="appliance-label">
          Pantry<small>{count('pantry')} items</small>
        </span>
      </button>
      <button
        className="cellar-entrance"
        onClick={() => {
          const cellar = document.getElementById('underground');
          cellar?.scrollIntoView({
            behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
              ? 'instant'
              : 'smooth',
          });
          cellar?.focus({ preventScroll: true });
        }}
        aria-label="Explore cellar"
      >
        <img src="/art/cellar-hatch.svg" alt="" />
        <span>Cellar ↓</span>
      </button>
    </div>
  );
}
