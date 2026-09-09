import { useKitchen } from '../../data/store';
import type { Food } from '../../domain/model';
import { countFood, units } from '../../domain/selectors';
import { foodGroup, packageLabel } from '../../domain/products/variants';
export function SearchResults({
  query,
  onSelect,
}: {
  query: string;
  onSelect: (food: Food) => void;
}) {
  const { data } = useKitchen();
  const branded = new Set(
    data.stock
      .filter((lot) =>
        `${lot.product?.name ?? ''} ${lot.product?.brand ?? ''}`
          .toLowerCase()
          .includes(query.trim().toLowerCase()),
      )
      .map((lot) => lot.foodId),
  );
  const matches = data.foods.filter(
    (food) =>
      `${food.name} ${food.brand} ${food.packageSize}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()) || branded.has(food.id),
  );
  const groups = Map.groupBy(matches, (food) => foodGroup(food.name));
  return (
    <div className="search-results">
      {[...groups].map(([key, foods]) => (
        <section className="food-search-group" key={key} aria-label={foods[0]?.name}>
          <h2>{foods[0]?.name}</h2>
          {foods.map((food) => (
            <button className="search-result" key={food.id} onClick={() => onSelect(food)}>
              <img src={`/art/${food.art}.svg`} alt="" />
              <span>
                {packageLabel(food) || 'Unspecified size'}
                <small>
                  {food.frozen ? 'Freezer' : food.location === 'fridge' ? 'Fridge' : 'Pantry'} ·{' '}
                  {units(countFood(data, food.id), food.unit)}
                </small>
              </span>
            </button>
          ))}
        </section>
      ))}
      {!matches.length && (
        <p className="empty-message">No food matches “{query}”. Add it with the + button.</p>
      )}
    </div>
  );
}
