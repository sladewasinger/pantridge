import { useEffect, useRef, useState } from 'react';

export function Camera({ onCode }: { onCode: (code: string) => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    let cancelled = false;
    let stop: (() => void) | undefined;
    const element = video.current;
    if (!element) return;
    void import('./decoder')
      .then(async ({ startDecoder }) => {
        if (cancelled) return;
        const controls = await startDecoder(element, (code) => {
          if (!cancelled) onCode(code);
        });
        stop = () => controls.stop();
        if (cancelled) stop();
      })
      .catch(() => {
        if (!cancelled)
          setError('Camera unavailable. Allow camera access or enter the barcode below.');
      });
    return () => {
      cancelled = true;
      stop?.();
    };
  }, [onCode]);
  return (
    <div className="scan-camera">
      <video ref={video} muted playsInline autoPlay aria-label="Barcode camera" />
      <div className="scan-guide" aria-hidden="true" />
      {error ? <p role="alert">{error}</p> : <p>Center the barcode</p>}
    </div>
  );
}
