import { useCallback, useRef, useState } from 'react';
import { Camera as CameraIcon, ScanBarcode } from 'lucide-react';
import { getAccount } from '../../data/store';
import type { StoragePage } from '../../app/navigation';
import { normalizeBarcode } from '../../domain/products/barcode';
import { Modal } from '../../ui/Modal';
import { Camera } from './Camera';
import { ScanConfirm } from './ScanConfirm';

export function ScanFood({
  location,
  onClose,
}: {
  location: StoragePage | null;
  onClose: () => void;
}) {
  const [account] = useState(getAccount);
  const [code, setCode] = useState('');
  const [camera, setCamera] = useState(false);
  const [barcode, setBarcode] = useState<string | null>(null);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const lookup = useCallback((value: string) => {
    if (lock.current) return;
    try {
      const normalized = normalizeBarcode(value);
      lock.current = true;
      setCamera(false);
      setBarcode(normalized);
      setError('');
    } catch {
      setError('Enter a valid barcode.');
    }
  }, []);
  return (
    <Modal title="Scan food" onClose={onClose}>
      {account === 'local' ? (
        <p>Sign in with Google to scan food.</p>
      ) : barcode ? (
        <ScanConfirm
          key={barcode}
          barcode={barcode}
          account={account}
          location={location}
          onDone={() => {
            lock.current = false;
            setBarcode(null);
            setCode('');
          }}
        />
      ) : (
        <>
          {camera && <Camera onCode={lookup} />}
          <button className="secondary full" onClick={() => setCamera(!camera)}>
            <CameraIcon size={20} />
            {camera ? 'Stop camera' : 'Open camera'}
          </button>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              lookup(code);
            }}
          >
            <label>
              Barcode
              <input
                inputMode="numeric"
                autoComplete="off"
                maxLength={14}
                required
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter the numbers below the barcode"
              />
            </label>
            <button className="primary full">
              <ScanBarcode size={19} />
              Find product
            </button>
          </form>
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
