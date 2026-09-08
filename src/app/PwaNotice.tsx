import { useRegisterSW } from 'virtual:pwa-register/react';
export function PwaNotice() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();
  if (!needRefresh) return null;
  return (
    <div className="update-notice" role="status">
      <span>A fresh version is ready.</span>
      <button onClick={() => void updateServiceWorker(true)}>Update</button>
      <button onClick={() => setNeedRefresh(false)}>Later</button>
    </div>
  );
}
