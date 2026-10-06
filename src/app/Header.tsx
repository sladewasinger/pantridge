import { ArrowLeft, Plus, Search, Settings2, X } from 'lucide-react';
import { viewTitle, type ViewState } from './navigation';
import { ScanButton } from '../features/scanning/ScanButton';
export function Header({
  view,
  onHome,
  onAdd,
  onSettings,
  onSearch,
  onScan,
}: {
  view: ViewState;
  onHome: () => void;
  onAdd: () => void;
  onSettings: () => void;
  onSearch: (query: string) => void;
  onScan: () => void;
}) {
  const home = view.page === 'kitchen' && !view.location && !view.query;
  const shopping = view.page === 'shopping';
  const cookbook = view.page === 'cookbook';
  const searchLabel = cookbook
    ? 'Find a recipe'
    : shopping
      ? 'Search shopping list'
      : 'Find your food';
  return (
    <header className={`app-header${shopping ? ' shopping-header' : ''}`}>
      {!shopping && (
        <div className="brand-row">
          <span className="brand">Pantridge</span>
          <button className="icon-button" onClick={onSettings} aria-label="Settings">
            <Settings2 size={19} />
          </button>
        </div>
      )}
      <div className="title-row">
        {!home && (
          <button className="round" onClick={onHome} aria-label="Back to kitchen">
            <ArrowLeft />
          </button>
        )}
        <h1>{viewTitle(view)}</h1>
        {view.page === 'kitchen' && <ScanButton onClick={onScan} />}
        {shopping && (
          <button className="icon-button" onClick={onSettings} aria-label="Settings">
            <Settings2 size={19} />
          </button>
        )}
        <button
          className="round add-button"
          aria-label={cookbook ? 'Write a recipe' : shopping ? 'Add shopping item' : 'Add food'}
          onClick={onAdd}
        >
          <Plus />
        </button>
      </div>
      <div className="search-field">
        <Search size={19} />
        <input
          type="search"
          aria-label={searchLabel}
          placeholder={
            cookbook ? 'Find a recipe' : shopping ? 'Search your list' : 'Find your food'
          }
          value={view.query}
          onChange={(e) => onSearch(e.target.value)}
        />
        {view.query && (
          <button
            className="icon-button clear-search"
            aria-label="Clear search"
            onClick={() => onSearch('')}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </header>
  );
}
