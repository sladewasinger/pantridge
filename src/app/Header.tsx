import { ArrowLeft, Plus, Search, Settings2 } from 'lucide-react';
import { viewTitle, type ViewState } from './navigation';
export function Header({
  view,
  onHome,
  onAdd,
  onSettings,
  onSearch,
}: {
  view: ViewState;
  onHome: () => void;
  onAdd: () => void;
  onSettings: () => void;
  onSearch: (query: string) => void;
}) {
  const home = view.page === 'kitchen' && !view.location && !view.query;
  return (
    <header className="app-header">
      <div className="brand-row">
        <span className="brand">Pantridge</span>
        <button className="icon-button" onClick={onSettings} aria-label="Settings">
          <Settings2 size={19} />
        </button>
      </div>
      <div className="title-row">
        {!home && (
          <button className="round" onClick={onHome} aria-label="Back to kitchen">
            <ArrowLeft />
          </button>
        )}
        <h1>{viewTitle(view)}</h1>
        <button
          className="round add-button"
          aria-label={view.page === 'shopping' ? 'Add shopping item' : 'Add food'}
          onClick={onAdd}
        >
          <Plus />
        </button>
      </div>
      {view.page === 'kitchen' && (
        <label className="search-field">
          <Search size={19} />
          <input
            type="search"
            aria-label="Find your food"
            placeholder="Find your food"
            value={view.query}
            onChange={(e) => onSearch(e.target.value)}
          />
        </label>
      )}
    </header>
  );
}
