import { useCallback, useRef, useState } from 'react';
import { Camera as CameraIcon, ScanBarcode } from 'lucide-react';
import { getAccount } from '../../data/store';
import type { StoragePage } from '../../app/navigation';
import type { Lookup } from '../../domain/products/lookup';
import { Modal } from '../../ui/Modal';
import { resolveBarcode } from './client';
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
  const [result, setResult] = useState<Lookup | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lock = useRef(false);
  const lookup = useCallback(
    (barcode: string) => {
      if (lock.current) return;
      lock.current = true;
      setCamera(false);
      setCode(barcode);
      setBusy(true);
      setError('');
      void resolveBarcode(barcode, account)
        .then(setResult)
        .catch((error: unknown) => {
          setError(error instanceof Error ? error.message : 'Lookup failed. Try again.');
        })
        .finally(() => {
          lock.current = false;
          setBusy(false);
        });
    },
    [account],
  );
  return (
    <Modal title="Scan food" onClose={onClose}>
      {account === 'local' ? (
        <p>Sign in with Google to scan food.</p>
      ) : result ? (
        <ScanConfirm
          result={result}
          account={account}
          location={location}
          onDone={() => {
            setResult(null);
            setCode('');
          }}
        />
      ) : (
        <>
          {camera && <Camera onCode={lookup} />}
          <button className="secondary full" disabled={busy} onClick={() => setCamera(!camera)}>
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
            <button className="primary full" disabled={busy}>
              <ScanBarcode size={19} />
              {busy ? 'Looking up…' : 'Find product'}
            </button>
          </form>
          {busy && (
            <p role="status" className="muted">
              Looking up your food…
            </p>
          )}
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
