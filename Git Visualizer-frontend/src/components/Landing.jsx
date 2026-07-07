import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listByCategory } from '../api.js';
import Footer from './Footer.jsx';
import ThemeButton from './ThemeButton.jsx';

const HERO_WORDS = ['thinking.', 'doing.', 'tracking.', 'remembering.', 'pointing at.', 'rewriting.'];

export default function Landing({ content, dark, toggleTheme, learned, requestReset }) {
  const navigate = useNavigate();
  const [heroIdx, setHeroIdx] = useState(0);
  const [query, setQuery] = useState('');
  const searchRef = useRef(null);

  useEffect(() => {
    const t = setInterval(() => setHeroIdx((i) => (i + 1) % HERO_WORDS.length), 1800);
    return () => clearInterval(t);
  }, []);

  // "/" focuses the search box (unless already typing in a field)
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        searchRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const groups = listByCategory(content);
  const total = content.commands.length;
  const learnedCount = Object.keys(learned).filter((k) => learned[k]).length;
  const progressPct = total ? Math.round((learnedCount / total) * 100) : 0;

  const q = query.trim().toLowerCase();
  const filteredGroups = useMemo(() => {
    if (!q) return groups;
    return groups
      .map((g) => ({
        ...g,
        commands: g.commands.filter((c) =>
          c.title.toLowerCase().includes(q) ||
          c.id.toLowerCase().includes(q) ||
          c.shortExplanation.toLowerCase().includes(q) ||
          c.category.toLowerCase().includes(q)),
      }))
      .filter((g) => g.commands.length);
  }, [q, groups]);
  const matchCount = filteredGroups.reduce((n, g) => n + g.commands.length, 0);

  return (
    <>
      <div className="gv-landing" style={{ maxWidth: 1180, margin: '0 auto', padding: '34px 40px 64px' }}>
        <div className="gv-landing-header" style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
          <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: '-.02em' }}>
            Git<span style={{ color: 'var(--gv-accent)', padding: '0 2.5px', letterSpacing: 0 }}>·</span>Visualizer
          </div>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12.5, color: 'var(--gv-muted)' }}>{learnedCount} of {total} visited</div>
            <div style={{ width: 120, height: 5, borderRadius: 3, background: 'var(--gv-border)', overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--gv-accent)', transition: 'width .5s ease' }} />
            </div>
            <div onClick={requestReset} title="Clear all visited checkmarks" className="hv-red" style={{ fontSize: 12, color: 'var(--gv-muted)', background: 'var(--gv-card)', border: '1px solid var(--gv-border)', borderRadius: 8, padding: '7px 12px', cursor: 'pointer' }}>
              ↺ Reset
            </div>
            <div onClick={() => navigate('/free')} className="hv-opacity" style={{ fontSize: 13, fontWeight: 600, color: 'var(--gv-on-ink)', background: 'var(--gv-ink)', borderRadius: 8, padding: '8px 16px', cursor: 'pointer' }}>
              Free play →
            </div>
            <ThemeButton dark={dark} onToggle={toggleTheme} />
          </div>
        </div>

        <div className="gv-hero" style={{ margin: '60px 0 46px', maxWidth: 660 }}>
          <div style={{ fontSize: 12, letterSpacing: '.16em', color: 'var(--gv-muted)', fontWeight: 600, marginBottom: 14 }}>
            AN INTERACTIVE GIT PLAYGROUND
          </div>
          <div className="gv-hero-title" style={{ fontSize: 48, fontWeight: 700, letterSpacing: '-.03em', lineHeight: 1.04, textWrap: 'balance' }}>
            See what Git is{' '}
            <span key={heroIdx} style={{ color: 'var(--gv-accent)', display: 'inline-block', animation: 'gvWordSwap .32s cubic-bezier(.34,1.56,.64,1) both' }}>
              {HERO_WORDS[heroIdx]}
            </span>
          </div>
          <div style={{ fontSize: 16.5, lineHeight: 1.65, color: 'var(--gv-text2)', marginTop: 18, maxWidth: 560 }}>
            Pick a command. Read what it does in plain language, watch its commit graph go from{' '}
            <b style={{ color: 'var(--gv-ink)' }}>before</b> to <b style={{ color: 'var(--gv-ink)' }}>after</b>, then type it
            yourself in a live sandbox. Nothing to install.
          </div>
        </div>

        <div style={{ maxWidth: 520, marginBottom: 30, position: 'relative' }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="var(--gv-muted)" strokeWidth="2" strokeLinecap="round" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}>
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.5" y2="16.5" />
          </svg>
          <input
            ref={searchRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Escape') setQuery(''); }}
            placeholder="Search commands…  (e.g. undo, branch, commit)"
            aria-label="Search git commands"
            style={{ width: '100%', boxSizing: 'border-box', padding: '11px 38px', fontSize: 14, fontFamily: 'inherit', color: 'var(--gv-ink)', background: 'var(--gv-card)', border: '1px solid var(--gv-border)', borderRadius: 10, outline: 'none' }}
          />
          {query ? (
            <span onClick={() => { setQuery(''); searchRef.current?.focus(); }} title="Clear" style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gv-muted)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</span>
          ) : (
            <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--gv-muted)', fontFamily: "'JetBrains Mono',monospace", fontSize: 11, border: '1px solid var(--gv-border)', borderRadius: 5, padding: '1px 6px', pointerEvents: 'none' }}>/</span>
          )}
        </div>

        {q && (
          <div style={{ fontSize: 12.5, color: 'var(--gv-muted)', marginBottom: 18 }}>
            {matchCount} {matchCount === 1 ? 'command' : 'commands'} matching “{query.trim()}”
          </div>
        )}

        {matchCount === 0 && (
          <div style={{ padding: '32px 0 8px', color: 'var(--gv-text2)', fontSize: 14.5 }}>
            No commands match “{query.trim()}”. Try a different term — or{' '}
            <span onClick={() => { setQuery(''); searchRef.current?.focus(); }} style={{ color: 'var(--gv-accent)', cursor: 'pointer', fontWeight: 600 }}>clear the search</span>.
          </div>
        )}

        {filteredGroups.map((g) => (
          <div key={g.category} style={{ marginBottom: 34 }}>
            <div style={{ fontSize: 11, letterSpacing: '.16em', color: 'var(--gv-muted)', fontWeight: 600, marginBottom: 14 }}>
              {g.category.toUpperCase()}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(224px,1fr))', gap: 14 }}>
              {g.commands.map((c) => (
                <div key={c.id} onClick={() => navigate(`/commands/${c.id}`)} className="hv-lift" style={{ background: 'var(--gv-card)', border: '1px solid var(--gv-border)', borderRadius: 14, padding: '17px 19px', cursor: 'pointer', transition: 'transform .18s ease,box-shadow .18s ease', animation: 'gvFade .4s ease both' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 13, color: 'var(--gv-accent)', fontWeight: 500 }}>{c.title}</div>
                    {learned[c.id] ? (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', background: '#0E9488', color: '#fff', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 'none' }}>✓</div>
                    ) : (
                      <div style={{ width: 20, height: 20, borderRadius: '50%', border: '1.5px dashed var(--gv-dash)', flex: 'none', boxSizing: 'border-box' }} />
                    )}
                  </div>
                  <div style={{ fontSize: 13.5, lineHeight: 1.4, color: 'var(--gv-text2)', marginTop: 9 }}>{c.shortExplanation}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {!q && (
          <div onClick={() => navigate('/free')} className="gv-freeplay" style={{ marginTop: 8, background: 'var(--gv-term)', borderRadius: 16, padding: '26px 30px', display: 'flex', alignItems: 'center', gap: 24, cursor: 'pointer', transition: 'transform .18s ease' }}>
            <svg viewBox="0 0 120 44" style={{ width: 120, height: 44, flex: 'none' }}>
              <line x1="12" y1="16" x2="52" y2="16" stroke="#2F6BD8" strokeWidth="2" />
              <line x1="52" y1="16" x2="92" y2="16" stroke="#2F6BD8" strokeWidth="2" />
              <line x1="52" y1="16" x2="76" y2="34" stroke="#7C5CE6" strokeWidth="2" />
              <circle cx="12" cy="16" r="6" fill="#171B26" stroke="#2F6BD8" strokeWidth="2" />
              <circle cx="52" cy="16" r="6" fill="#171B26" stroke="#2F6BD8" strokeWidth="2" />
              <circle cx="92" cy="16" r="6" fill="#2F6BD8" />
              <circle cx="76" cy="34" r="6" fill="#171B26" stroke="#7C5CE6" strokeWidth="2" />
            </svg>
            <div>
              <div style={{ color: '#fff', fontWeight: 600, fontSize: 16 }}>Free-play sandbox</div>
              <div style={{ color: '#8B93A7', fontSize: 13.5, marginTop: 4 }}>A live repository and every command, no rails. Break things on purpose.</div>
            </div>
            <div style={{ marginLeft: 'auto', color: '#8FD3C7', fontFamily: "'JetBrains Mono',monospace", fontSize: 13 }}>git … ↵</div>
          </div>
        )}
      </div>
      <Footer />
    </>
  );
}
