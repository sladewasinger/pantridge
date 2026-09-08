import { Kitchen } from '../features/kitchen/Kitchen';
import { Storage } from '../features/kitchen/Storage';
import { SearchResults } from '../features/kitchen/SearchResults';
import { FoodDetails } from '../features/food/FoodDetails';
import { AddFood } from '../features/food/AddFood';
import { Shopping } from '../features/shopping/Shopping';
import { ShoppingForm } from '../features/shopping/ShoppingForm';
import { PutAway } from '../features/shopping/PutAway';
import { Settings } from '../features/settings/Settings';
import type { Overlay, ViewState, StoragePage } from './navigation';

export function MainView({
  view,
  onOpen,
  onOverlay,
}: {
  view: ViewState;
  onOpen: (location: StoragePage) => void;
  onOverlay: (overlay: Overlay) => void;
}) {
  if (view.page === 'shopping')
    return (
      <Shopping
        query={view.query}
        onAdd={() => onOverlay({ type: 'shopping' })}
        onEdit={(item) => onOverlay({ type: 'shopping', item })}
        onPutAway={() => onOverlay({ type: 'put-away' })}
      />
    );
  if (view.query)
    return (
      <SearchResults
        query={view.query}
        onSelect={(food) => onOverlay({ type: 'food', id: food.id })}
      />
    );
  if (view.location)
    return (
      <Storage
        key={view.location}
        location={view.location}
        onAdd={(shelf) => onOverlay({ type: 'add', shelf })}
        onSelect={(food) => onOverlay({ type: 'food', id: food.id })}
      />
    );
  return <Kitchen onOpen={onOpen} />;
}
export function OverlayView({
  overlay,
  location,
  onClose,
}: {
  overlay: Overlay | null;
  location: StoragePage | null;
  onClose: () => void;
}) {
  if (!overlay) return null;
  switch (overlay.type) {
    case 'food':
      return <FoodDetails foodId={overlay.id} onClose={onClose} />;
    case 'add':
      return <AddFood location={location ?? 'pantry'} shelf={overlay.shelf} onClose={onClose} />;
    case 'shopping':
      return <ShoppingForm item={overlay.item} onClose={onClose} />;
    case 'put-away':
      return <PutAway onClose={onClose} />;
    case 'settings':
      return <Settings onClose={onClose} />;
  }
}
