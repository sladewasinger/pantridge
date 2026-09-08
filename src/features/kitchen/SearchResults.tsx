import { useKitchen } from '../../data/store';
import type { Food } from '../../domain/model';
import { countFood, units } from '../../domain/selectors';
export function SearchResults({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (food: Food) => void;
}) {
  const { data } = useKitchen();
  const matches = data.foods.filter((food) =>
    `${food.name} ${food.brand} ${food.packageSize}`.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <div className="search-results">
      {matches.map((food) => (
        <button className="search-result" key={food.id} onClick={() => onSelect(food)}>
          <img src={`/art/${food.art}.svg`} alt="" />
          <span>
            {food.name}
            <small>
              {food.brand || food.location} · {units(countFood(data, food.id), food.unit)}
            </small>
          </span>
        </button>
      ))}
      {!matches.length && (
        <p className="empty-message">No food matches “{query}”. Add it with the + button.</p>
      )}
    </div>
  );
}
