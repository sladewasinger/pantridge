import type { StoragePage } from '../../app/navigation';

function Door({ side }: { side: 'left' | 'right' }) {
  return (
    <div className={`swing-door door-${side}`}>
      <div className="door-face door-front">
        <span className="door-panel" />
        <span className="door-handle" />
      </div>
      <div className="door-face door-inside">
        <span />
        <span />
        <span />
      </div>
      <div className="door-edge" />
    </div>
  );
}
export function Doors({ location }: { location: StoragePage }) {
  if (location === 'unspecified') return null;
  return (
    <div className="door-stage" aria-hidden="true">
      {location === 'pantry' && <Door side="left" />}
      <Door side="right" />
    </div>
  );
}
