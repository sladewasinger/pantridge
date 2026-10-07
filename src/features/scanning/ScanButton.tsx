import { LockKeyhole, ScanBarcode } from 'lucide-react';
import { getAccount, useKitchen } from '../../data/store';
import { localTesting } from '../../local-testing';
export function ScanButton({ onClick }: { onClick: () => void }) {
  useKitchen();
  const signedIn = getAccount() !== 'local' || localTesting;
  return (
    <span className="scan-entry">
      <button
        className="round"
        disabled={!signedIn}
        onClick={onClick}
        aria-label={signedIn ? 'Scan food barcode' : 'Sign in to scan'}
        title={signedIn ? 'Scan food barcode' : 'Sign in to scan'}
      >
        <ScanBarcode size={21} />
        {!signedIn && <LockKeyhole className="scan-lock" size={11} />}
      </button>
      {!signedIn && <small>Sign in to scan</small>}
    </span>
  );
}
