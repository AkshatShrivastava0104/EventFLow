import { useEffect, useRef } from 'react';

/**
 * Lightweight QR-style renderer.
 *
 * NOTE:
 * This is a deterministic visual QR-style pattern.
 * It is NOT a real machine-scannable QR code.
 *
 * If actual phone/scanner scanning is required, this component
 * should later be replaced with a real QR library such as
 * qrcode.react.
 */
export function QRCode({
  value,
  size = 200,
}: {
  value?: string | null;
  size?: number;
}) {
  const canvasRef =
    useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas =
      canvasRef.current;

    if (!canvas) {
      return;
    }

    const ctx =
      canvas.getContext('2d');

    if (!ctx) {
      return;
    }

    const safeValue =
      typeof value === 'string'
        ? value
        : '';

    const N = 29;
    const cell = size / N;

    /*
     * Clear canvas.
     */
    ctx.clearRect(
      0,
      0,
      size,
      size,
    );

    /*
     * White background.
     */
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(
      0,
      0,
      size,
      size,
    );

    /*
     * If there is no ticket code yet,
     * don't generate a fake QR pattern.
     */
    if (!safeValue) {
      ctx.fillStyle = '#0f1319';

      ctx.font =
        'bold 12px sans-serif';

      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      ctx.fillText(
        'Ticket pending',
        size / 2,
        size / 2,
      );

      return;
    }

    ctx.fillStyle = '#0f1319';

    /*
     * Deterministic pattern from ticket code.
     */
    let seed = 0;

    for (
      let i = 0;
      i < safeValue.length;
      i++
    ) {
      seed =
        (seed * 31 +
          safeValue.charCodeAt(i)) >>>
        0;
    }

    const rand = () => {
      seed =
        (seed * 1664525 +
          1013904223) >>>
        0;

      return (
        (seed & 0xffff) /
        0xffff
      );
    };

    /*
     * Finder pattern.
     */
    const drawFinder = (
      x: number,
      y: number,
    ) => {
      /*
       * Outer square.
       */
      ctx.fillStyle = '#0f1319';

      ctx.fillRect(
        x * cell,
        y * cell,
        cell * 7,
        cell * 7,
      );

      /*
       * White middle.
       */
      ctx.fillStyle = '#ffffff';

      ctx.fillRect(
        (x + 1) * cell,
        (y + 1) * cell,
        cell * 5,
        cell * 5,
      );

      /*
       * Inner square.
       */
      ctx.fillStyle = '#0f1319';

      ctx.fillRect(
        (x + 2) * cell,
        (y + 2) * cell,
        cell * 3,
        cell * 3,
      );
    };

    /*
     * Generate data pattern.
     */
    for (
      let y = 0;
      y < N;
      y++
    ) {
      for (
        let x = 0;
        x < N;
        x++
      ) {
        const inFinder =
          (x < 8 && y < 8) ||
          (x >= N - 8 &&
            y < 8) ||
          (x < 8 &&
            y >= N - 8);

        if (inFinder) {
          continue;
        }

        if (rand() > 0.55) {
          ctx.fillRect(
            x * cell + 0.5,
            y * cell + 0.5,
            cell - 1,
            cell - 1,
          );
        }
      }
    }

    /*
     * Finder patterns.
     */
    drawFinder(0, 0);
    drawFinder(N - 7, 0);
    drawFinder(
      0,
      N - 7,
    );
  }, [value, size]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className="rounded-lg"
      aria-label={
        value
          ? `Ticket QR code ${value}`
          : 'Ticket QR code pending'
      }
    />
  );
}