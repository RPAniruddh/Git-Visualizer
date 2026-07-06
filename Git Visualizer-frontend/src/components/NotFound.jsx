import { useNavigate } from 'react-router-dom';
import ThemeButton from './ThemeButton.jsx';

const MONO = "'JetBrains Mono',monospace";

export default function NotFound({ dark, toggleTheme }) {
  const navigate = useNavigate();
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <div style={{ display: 'flex', alignItems: 'center', padding: '22px 28px' }}>
        <div onClick={() => navigate('/')} style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-.02em', cursor: 'pointer' }}>
          Git<span style={{ color: 'var(--gv-accent)', padding: '0 2.5px', letterSpacing: 0 }}>·</span>Visualizer
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <ThemeButton dark={dark} onToggle={toggleTheme} />
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
        <div style={{ maxWidth: 460, textAlign: 'center' }}>
          <div style={{ fontFamily: MONO, fontSize: 72, fontWeight: 600, letterSpacing: '-.03em', color: 'var(--gv-accent)', lineHeight: 1 }}>404</div>
          <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-.02em', marginTop: 18 }}>This page is off the graph</div>
          <div style={{ fontSize: 14.5, lineHeight: 1.6, color: 'var(--gv-text2)', marginTop: 10 }}>
            That route doesn’t point at anything — it may have been mistyped, or the command doesn’t exist.
          </div>
          <div style={{ display: 'inline-block', fontFamily: MONO, fontSize: 12.5, color: 'var(--gv-muted)', background: 'var(--gv-active)', border: '1px solid var(--gv-border)', borderRadius: 8, padding: '7px 12px', marginTop: 20 }}>
            git checkout main
          </div>
          <div style={{ marginTop: 26 }}>
            <div onClick={() => navigate('/')} className="hv-opacity" style={{ display: 'inline-block', fontSize: 14, fontWeight: 600, color: 'var(--gv-on-ink)', background: 'var(--gv-ink)', borderRadius: 8, padding: '10px 22px', cursor: 'pointer' }}>
              ← Back to all commands
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
