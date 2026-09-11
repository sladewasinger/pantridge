import { useEffect, useRef, useState } from 'react';
import { DoorClosed, Refrigerator, Snowflake, Package, Plus } from 'lucide-react';
import type { Food } from '../../domain/model';
import { cellarFoods } from '../../domain/selectors';
import { useKitchen } from '../../data/store';
import { FoodTile } from '../kitchen/FoodTile';

function Placement({ food }: { food: Food }) {
  const place = food.frozen ? 'freezer' : food.location;
  const Icon = {
    fridge: Refrigerator,
    freezer: Snowflake,
    pantry: DoorClosed,
    unspecified: Package,
  }[place];
  return (
    <span
      className={`underground-location ${place}`}
      title={place}
      role="img"
      aria-label={`Stored in ${place}`}
    >
      <Icon size={13} />
    </span>
  );
}
export function Underground({
  onSelect,
  onAdd,
}: {
  onSelect: (food: Food) => void;
  onAdd: () => void;
}) {
  const { data } = useKitchen();
  const [limit, setLimit] = useState(24);
  const sentinel = useRef<HTMLButtonElement>(null);
  const foods = cellarFoods(data);
  const visible = foods.slice(0, limit);
  const more = limit < foods.length;
  useEffect(() => {
    if (!more || !sentinel.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setLimit((current) => current + 24);
      },
      { rootMargin: '250px' },
    );
    observer.observe(sentinel.current);
    return () => observer.disconnect();
  }, [more, limit]);
  return (
    <section className="underground" id="underground" tabIndex={-1} aria-label="Cellar inventory">
      <div className="underground-heading">
        <div>
          <h2>Cellar</h2>
          <small>{foods.length} items</small>
        </div>
        <button className="round" onClick={onAdd} aria-label="Add unassigned item">
          <Plus size={20} />
        </button>
      </div>
      <div className="underground-legend" role="group" aria-label="Storage key">
        <span>
          <Package size={13} /> Unspecified first
        </span>
        <span>
          <Refrigerator size={13} /> Fridge
        </span>
        <span>
          <DoorClosed size={13} /> Pantry
        </span>
        <span>
          <Snowflake size={13} /> Freezer
        </span>
      </div>
      {Array.from({ length: Math.ceil(visible.length / 2) }, (_, index) => (
        <div className="underground-shelf" key={index} data-depth={index % 4}>
          {visible.slice(index * 2, index * 2 + 2).map((food) => (
            <div className="underground-slot" key={food.id}>
              <Placement food={food} />
              <FoodTile food={food} data={data} onSelect={onSelect} onDragStart={() => {}} />
            </div>
          ))}
        </div>
      ))}
      {!foods.length && (
        <button className="underground-empty" onClick={onAdd}>
          Empty <Plus size={16} />
        </button>
      )}
      {more && (
        <button
          ref={sentinel}
          className="underground-more"
          onClick={() => setLimit((current) => current + 24)}
        >
          Deeper ↓
        </button>
      )}
      <div className="underground-bedrock" aria-hidden="true" />
    </section>
  );
}
