export default function ErrorScreen({ error }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--gv-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gv-ink)' }}>
      <div style={{ maxWidth: 420, textAlign: 'center', padding: 32 }}>
        <div style={{ fontSize: 44, marginBottom: 18 }}>⚠️</div>
        <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-.02em', marginBottom: 10 }}>We’re facing some interruption</div>
        <div style={{ fontSize: 14.5, lineHeight: 1.55, color: 'var(--gv-text2)', marginBottom: 26 }}>
          The command library couldn’t be reached right now. Please check your connection or try again in a moment.
        </div>
        <div
          onClick={() => window.location.reload()}
          style={{ display: 'inline-block', fontSize: 14, fontWeight: 600, color: 'var(--gv-on-ink)', background: 'var(--gv-ink)', borderRadius: 8, padding: '10px 22px', cursor: 'pointer' }}
        >
          Try again
        </div>
        <div style={{ marginTop: 16, fontSize: 12, color: 'var(--gv-muted)', fontFamily: "'JetBrains Mono',monospace" }}>
          {String(error?.message || error)}
        </div>
      </div>
    </div>
  );
}
