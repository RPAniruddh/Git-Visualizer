import { useEffect, useState } from 'react';

const NODES = [30, 70, 110, 150];

// Shown while the command library is being fetched at boot. The backend runs on
// a free tier that can cold-start, so after a few seconds we reassure the user
// that a slow first load is expected rather than broken.
export default function LoadingScreen() {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setSlow(true), 5000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ fontWeight: 700, fontSize: 18, letterSpacing: '-.02em', marginBottom: 26 }}>
        Git<span style={{ color: 'var(--gv-accent)', padding: '0 2.5px', letterSpacing: 0 }}>·</span>Visualizer
      </div>

      <svg viewBox="0 0 180 40" width="180" height="40" aria-hidden="true">
        <line x1="30" y1="20" x2="150" y2="20" stroke="var(--gv-border)" strokeWidth="2" />
        {NODES.map((cx, i) => (
          <circle
            key={cx}
            cx={cx}
            cy="20"
            r="7"
            fill="var(--gv-accent)"
            style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `gvPulse 1.2s ease-in-out ${i * 0.18}s infinite` }}
          />
        ))}
      </svg>

      <div style={{ fontSize: 14, color: 'var(--gv-text2)', marginTop: 22 }}>
        Connecting to the command library…
      </div>

      <div style={{ fontSize: 12.5, color: 'var(--gv-muted)', marginTop: 10, maxWidth: 340, textAlign: 'center', lineHeight: 1.55, opacity: slow ? 1 : 0, transition: 'opacity .4s ease' }}>
        The server may be waking up from idle — the first load can take up to a minute.
      </div>
    </div>
  );
}
