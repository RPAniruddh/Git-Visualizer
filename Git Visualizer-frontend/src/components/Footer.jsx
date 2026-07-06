export default function Footer() {
  return (
    <div className="gv-footer" style={{ borderTop: '1px solid var(--gv-border)', background: 'var(--gv-bg2)', padding: '18px 40px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
      <div style={{ fontWeight: 700, fontSize: 13, letterSpacing: '-.02em', color: 'var(--gv-text2)' }}>
        Git<span style={{ color: 'var(--gv-accent)', padding: '0 2px', letterSpacing: 0 }}>·</span>Visualizer
      </div>
      <div style={{ fontSize: 12, color: 'var(--gv-muted)' }}>— an interactive git playground</div>
      <a
        href="https://www.linkedin.com/in/aniruddh-panicker-3708b7249/"
        target="_blank"
        rel="noopener noreferrer"
        className="hv-border"
        style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600, color: 'var(--gv-text2)', textDecoration: 'none', border: '1px solid var(--gv-border)', borderRadius: 8, padding: '6px 12px', background: 'var(--gv-card)' }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="#0A66C2" style={{ flex: 'none' }}>
          <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.36V9h3.41v1.56h.05c.47-.9 1.63-1.85 3.36-1.85 3.6 0 4.27 2.37 4.27 5.45v6.29zM5.34 7.43a2.06 2.06 0 1 1 0-4.12 2.06 2.06 0 0 1 0 4.12zM7.12 20.45H3.56V9h3.56v11.45z" />
        </svg>
        Built by Aniruddh Panicker
      </a>
    </div>
  );
}
