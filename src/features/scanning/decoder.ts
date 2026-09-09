import { BrowserMultiFormatReader } from '@zxing/browser';
import { BarcodeFormat, DecodeHintType } from '@zxing/library';

export async function startDecoder(video: HTMLVideoElement, onCode: (code: string) => void) {
  const hints = new Map<DecodeHintType, unknown>([
    [
      DecodeHintType.POSSIBLE_FORMATS,
      [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.ITF],
    ],
  ]);
  const reader = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 180 });
  return reader.decodeFromConstraints(
    {
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1280 },
        height: { ideal: 720 },
      },
      audio: false,
    },
    video,
    (result, _error, controls) => {
      if (!result) return;
      controls.stop();
      onCode(result.getText());
    },
  );
}
