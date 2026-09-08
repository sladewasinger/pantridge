import { Minus, Plus } from 'lucide-react';
import { useState } from 'react';
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
  const [draft, setDraft] = useState<string | null>(null);
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
        inputMode="numeric"
        required
        aria-label={label}
        min={min}
        max={max}
        value={draft ?? value}
        onBlur={() => setDraft(null)}
        onChange={(e) => {
          setDraft(e.target.value);
          const number = e.target.valueAsNumber;
          if (Number.isInteger(number) && number >= min && number <= max) onChange(number);
        }}
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
