import { Check } from 'lucide-react';
import { useState } from 'react';
import type { Food } from '../../domain/model';
import { artwork, artworkGroups, type ArtworkGroup } from '../../domain/artwork/catalog';
export function ArtPicker({
  value,
  onChange,
}: {
  value: Food['art'] | undefined;
  onChange: (art: Food['art']) => void;
}) {
  const [query, setQuery] = useState('');
  const [group, setGroup] = useState<ArtworkGroup>('All');
  const selected = artwork.find((art) => art.id === value);
  const visible = artwork.filter(
    (art) =>
      (group === 'All' || art.group === group) &&
      `${art.label} ${art.shape} ${art.keywords}`
        .toLowerCase()
        .includes(query.trim().toLowerCase()),
  );
  return (
    <fieldset className="art-field">
      <legend>Illustration</legend>
      {selected && (
        <div className="art-selected" role="status">
          <img src={selected.src} alt="" />
          <span>{selected.label}</span>
        </div>
      )}
      <label className="art-search">
        <span className="sr-only">Search illustrations</span>
        <input
          type="search"
          placeholder="Search illustrations"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
      </label>
      <div className="art-filters" role="group" aria-label="Illustration category">
        {artworkGroups.map((category) => (
          <button
            key={category}
            type="button"
            aria-pressed={category === group}
            onClick={() => setGroup(category)}
          >
            {category}
          </button>
        ))}
      </div>
      <div className="art-picker">
        {visible.map((art) => (
          <button
            key={art.id}
            type="button"
            aria-label={`Use ${art.label} artwork`}
            aria-pressed={value === art.id}
            title={art.label}
            onClick={() => onChange(art.id)}
          >
            <img src={art.src} alt="" draggable="false" loading="lazy" />
            <span>{art.label}</span>
            {value === art.id && <Check size={12} aria-hidden="true" />}
          </button>
        ))}
      </div>
      {!visible.length && (
        <p className="muted" role="status">
          No illustrations found.
        </p>
      )}
    </fieldset>
  );
}
