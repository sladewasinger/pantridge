import type { Page } from '@playwright/test';

// A real EAN-13 image carried through a synthetic camera stream. The application
// still decodes video pixels with its production ZXing code.
export async function cameraFixture(page: Page) {
  await page.addInitScript(() => {
    const left = [
      '0001101',
      '0011001',
      '0010011',
      '0111101',
      '0100011',
      '0110001',
      '0101111',
      '0111011',
      '0110111',
      '0001011',
    ];
    const parity = [
      'LLLLLL',
      'LLGLGG',
      'LLGGLG',
      'LLGGGL',
      'LGLLGG',
      'LGGLLG',
      'LGGGLL',
      'LGLGLG',
      'LGLGGL',
      'LGGLGL',
    ];
    const code = '3017620422003';
    const invert = (bits: string) => [...bits].map((bit) => (bit === '0' ? '1' : '0')).join('');
    let bars = '101';
    for (let i = 1; i < 7; i++) {
      const pattern = left[Number(code[i])]!;
      bars +=
        parity[Number(code[0])]![i - 1] === 'L' ? pattern : invert([...pattern].reverse().join(''));
    }
    bars += '01010';
    for (let i = 7; i < 13; i++) bars += invert(left[Number(code[i])]!);
    bars += '101';
    const canvas = document.createElement('canvas');
    canvas.width = 640;
    canvas.height = 360;
    const context = canvas.getContext('2d')!;
    function draw() {
      context.fillStyle = '#fff';
      context.fillRect(0, 0, 640, 360);
      context.fillStyle = '#000';
      [...bars].forEach((bit, i) => {
        if (bit === '1') context.fillRect(130 + i * 4, 55, 4, 250);
      });
    }
    draw();
    const stream = canvas.captureStream(10);
    const timer = setInterval(draw, 100);
    Object.defineProperty(navigator.mediaDevices, 'getUserMedia', {
      value: () => Promise.resolve(stream),
    });
    window.addEventListener('pagehide', () => {
      clearInterval(timer);
      stream.getTracks().forEach((track) => track.stop());
    });
  });
}
