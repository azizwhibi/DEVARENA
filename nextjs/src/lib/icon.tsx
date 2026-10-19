import { ImageResponse } from 'next/og';

// "</>" monogram on the arena background; maskable keeps content inside the 80% safe zone.
export function monogram(size: number, maskable = false) {
  const font = Math.round(size * (maskable ? 0.3 : 0.4));
  return new ImageResponse(
    (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0f172a', color: '#22c55e', fontSize: font, fontWeight: 800, fontFamily: 'monospace', letterSpacing: -font / 10 }}>
        {'</>'}
      </div>
    ),
    { width: size, height: size },
  );
}
