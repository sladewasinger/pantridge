import { useState } from 'react';
import { getAccount, updateKitchen } from '../data/store';
import { localTesting } from '../local-testing';
import { useAction } from '../ui/useAction';

export function LocalSample() {
  const { run, error, busy } = useAction();
  const [result, setResult] = useState('');
  if (!localTesting) return null;
  return (
    <section className="settings-section">
      <h3>Test with a full kitchen</h3>
      <p className="muted">Add a 200-food sample. Your existing food and recipes stay saved.</p>
      <button
        className="secondary full"
        disabled={busy}
        onClick={() =>
          void run(async () => {
            if (!localTesting || getAccount() !== 'local')
              throw new Error('Local test kitchens only.');
            const { addSampleFoods } = await import('./sample-kitchen');
            let added = 0;
            await updateKitchen((value) => {
              const data = addSampleFoods(value.data);
              added = data.foods.length - value.data.foods.length;
              return { ...value, data };
            });
            setResult(added ? `Added ${added} sample foods.` : 'Sample foods already loaded.');
          })
        }
      >
        {busy ? 'Adding sample foods…' : 'Load 200 sample foods'}
      </button>
      {result && <p role="status">{result}</p>}
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
    </section>
  );
}
