import { Minus, Plus } from 'lucide-react';
export function Quantity({
  value,
  onChange,
  min = 0,
  max = 999,
  label = 'Quantity',
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  label?: string;
}) {
  return (
    <div className="quantity-control" role="group" aria-label={label}>
      <button
        type="button"
        className="round"
        disabled={value <= min}
        onClick={() => onChange(value - 1)}
        aria-label={`Decrease ${label.toLowerCase()}`}
      >
        <Minus />
      </button>
      <input
        type="number"
        aria-label={label}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Math.min(max, Math.max(min, Number(e.target.value))))}
      />
      <button
        type="button"
        className="round"
        disabled={value >= max}
        onClick={() => onChange(value + 1)}
        aria-label={`Increase ${label.toLowerCase()}`}
      >
        <Plus />
      </button>
    </div>
  );
}
