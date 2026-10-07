import { Bookmark, Pencil } from 'lucide-react';
export function RecipeSaveTools({
  busy,
  saved,
  changed,
  onSave,
  onEdit,
}: {
  busy: boolean;
  saved: boolean;
  changed: boolean;
  onSave: () => void;
  onEdit: () => void;
}) {
  return (
    <div className="recipe-detail-tools">
      <button className="text-button" disabled={busy || (saved && !changed)} onClick={onSave}>
        <Bookmark size={17} />
        {changed ? 'Save changes' : saved ? 'Saved' : 'Save recipe'}
      </button>
      <button className="text-button" disabled={busy} onClick={onEdit}>
        <Pencil size={17} />
        Edit
      </button>
    </div>
  );
}
