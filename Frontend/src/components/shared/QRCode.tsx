import { useEffect, useRef } from 'react';

/**
 * Lightweight QR code renderer. Pure SVG output based on a simple grid
 * pattern derived from the code string. It's a stylized, deterministic QR
 * look-alike — perfect for demo tickets. If you need an actual scanable QR,
 * swap this component with `qrcode.react`.
 */
export function QRCode({ value, size = 200 }: { value: string; size?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const N = 29;
    const cell = size / N;
    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0f1319';

    // deterministic pattern from value
    let seed = 0;
    for (let i = 0; i < value.length; i++) seed = (seed * 31 + value.charCodeAt(i)) >>> 0;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return (seed & 0xffff) / 0xffff; };

    const drawFinder = (x: number, y: number) => {
      ctx.fillRect(x * cell, y * cell, cell * 7, cell * 7);
      ctx.fillStyle = '#fff';
      ctx.fillRect((x + 1) * cell, (y + 1) * cell, cell * 5, cell * 5);
      ctx.fillStyle = '#0f1319';
      ctx.fillRect((x + 2) * cell, (y + 2) * cell, cell * 3, cell * 3);
    };

    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const inFinder = (x < 8 && y < 8) || (x >= N - 8 && y < 8) || (x < 8 && y >= N - 8);
        if (inFinder) continue;
        if (rand() > 0.55) {
          ctx.fillRect(x * cell + 0.5, y * cell + 0.5, cell - 1, cell - 1);
        }
      }
    }
    drawFinder(0, 0); drawFinder(N - 7, 0); drawFinder(0, N - 7);
  }, [value, size]);

  return <canvas ref={canvasRef} width={size} height={size} className="rounded-lg" />;
}
