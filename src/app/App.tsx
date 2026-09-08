import { House, ShoppingBasket } from 'lucide-react';
import { Header } from './Header';
import { MainView, OverlayView } from './Views';
import { SyncIndicator } from './SyncIndicator';
import { PwaNotice } from './PwaNotice';
import { UndoNotice } from '../ui/UndoNotice';
import {
  closeOverlay,
  navigate,
  openLocation,
  openOverlay,
  search,
  useNavigation,
} from './history';

export function App() {
  const { page, location, query, overlay } = useNavigation();
  const settings = () => openOverlay({ type: 'settings' });
  return (
    <div className="app-shell">
      <Header
        view={{ page, location, query }}
        onHome={() => navigate('kitchen')}
        onSearch={search}
        onSettings={settings}
        onAdd={() => openOverlay({ type: page === 'shopping' ? 'shopping' : 'add' })}
      />
      <main id="main-content">
        <MainView view={{ page, location, query }} onOpen={openLocation} onOverlay={openOverlay} />
      </main>
      <SyncIndicator onClick={settings} />
      <nav className="bottom-nav" aria-label="Main navigation">
        <button
          aria-current={page === 'kitchen' ? 'page' : undefined}
          onClick={() => navigate('kitchen')}
        >
          <House size={22} />
          Kitchen
        </button>
        <button
          aria-current={page === 'shopping' ? 'page' : undefined}
          onClick={() => navigate('shopping')}
        >
          <ShoppingBasket size={22} />
          Shopping
        </button>
      </nav>
      <OverlayView overlay={overlay} location={location} onClose={closeOverlay} />
      <PwaNotice />
      <UndoNotice />
    </div>
  );
}
