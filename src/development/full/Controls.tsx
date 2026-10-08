import { useState } from 'react';
import { getToken, fullAccount, selectedAccount, selectAccount } from './session';
import { useAction } from '../../ui/useAction';
export function FullControls() {
  const { run, error, busy } = useAction();
  const [message, setMessage] = useState('');
  const request = async (path: string, body: unknown) => {
    const response = await fetch(`/api/v1/dev/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${await getToken(fullAccount())}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error('Local test control failed.');
    setMessage(path === 'tick' ? 'Worker checked due jobs.' : 'Test condition set.');
  };
  return (
    <section className="settings-section">
      <h3>Full local test · {import.meta.env.VITE_FULL_MODE} AI</h3>
      <p>Local database only. Google login is simulated.</p>
      <label>
        Test account
        <select value={selectedAccount()} onChange={(event) => selectAccount(event.target.value)}>
          <option value="dev-alice">Alice</option>
          <option value="dev-bob">Bob</option>
        </select>
      </label>
      <details>
        <summary>Test controls</summary>
        <button
          className="secondary full"
          disabled={busy}
          onClick={() => void run(() => request('tick', {}))}
        >
          Run due worker jobs
        </button>
        <button
          className="secondary full"
          disabled={busy}
          onClick={() => void run(() => request('controls', { syncFailures: 1 }))}
        >
          Fail next sync
        </button>
        <button
          className="secondary full"
          disabled={busy}
          onClick={() => void run(() => request('controls', { providerFailures: 1 }))}
        >
          Fail next classification
        </button>
        <button
          className="secondary full"
          disabled={busy}
          onClick={() => void run(() => request('controls', { providerDelay: 10000 }))}
        >
          Delay classification 10 seconds
        </button>
        <button
          className="secondary full"
          disabled={busy}
          onClick={() =>
            void run(() =>
              request('controls', { syncFailures: 0, providerFailures: 0, providerDelay: 0 }),
            )
          }
        >
          Clear test conditions
        </button>
      </details>
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
