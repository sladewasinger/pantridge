import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { initializeSession } from './auth/session';
import { loadKitchen } from './data/store';
import { startSync } from './data/sync';
import { App } from './app/App';
import { initializeNavigation } from './app/history';
import './styles/base.css';
import './styles/kitchen.css';
import './styles/doors.css';
import './styles/forms.css';
import './styles/shopping.css';

const element = document.getElementById('root');
if (!element) throw new Error('App root is missing.');
const root = createRoot(element);
root.render(
  <div className="loading" role="status">
    Opening your kitchen…
  </div>,
);
async function boot() {
  const account = await initializeSession();
  await loadKitchen(account);
  initializeNavigation(account);
  root.render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
  startSync();
}
void boot().catch((error: unknown) => {
  root.render(
    <div className="startup-error">
      <h1>Your kitchen couldn’t open</h1>
      <p>{error instanceof Error ? error.message : 'Please try again.'}</p>
      <p>Check that browser storage is available, then reload.</p>
      <button onClick={() => window.location.reload()}>Try again</button>
    </div>,
  );
});
