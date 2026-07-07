import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { listByCategory } from '../api.js';
import * as GitSim from '../lib/gitSim.js';
import * as GVGraph from '../lib/graphRender.js';
import { ACCENT, areaChipStyle, fmt } from '../lib/format.jsx';
import { LessonGraph, LiveGraph } from './graphs.jsx';
import Footer from './Footer.jsx';
import ThemeButton from './ThemeButton.jsx';

const MONO = "'JetBrains Mono',monospace";
const TERM_COLORS = { ok: '#8FD3C7', out: '#8B93A7', err: '#E58F8F' };

export default function Workspace({ content, dark, toggleTheme, learned, markLearned, requestReset, commandId }) {
  const navigate = useNavigate();
  const isFree = commandId === 'free';
  const cmd = isFree ? null : content.commands.find((c) => c.id === commandId);

  const [tab, setTab] = useState('lesson');
  const [phase, setPhase] = useState('before');
  const [playing, setPlaying] = useState(false);
  const [input, setInput] = useState('');
  const [term, setTerm] = useState([]);
  const [tick, setTick] = useState(0);
  const [openCats, setOpenCats] = useState({});
  const [sideOpen, setSideOpen] = useState(false);

  const repoRef = useRef(null);
  const termRef = useRef(null);
  const playT = useRef(null);

  // Seed lazily on first render — the route remounts this component per command
  // (key={id}), so a fresh mount always gets a fresh repo for its sandboxSeed.
  if (!repoRef.current) repoRef.current = GitSim.seed((cmd && cmd.sandboxSeed) || 'freeplay');

  useEffect(() => {
    setTerm([
      cmd
        ? { text: `# Sandbox for ${cmd.title} — type a command or click a chip.`, color: 'var(--gv-text2)' }
        : { text: '# Free play. Empty-ish repo, every command. Type help for the list.', color: 'var(--gv-text2)' },
    ]);
    if (cmd) markLearned(cmd.id);
    return () => { if (playT.current) clearTimeout(playT.current); };
  }, [commandId]); // eslint-disable-line react-hooks/exhaustive-deps

  const promptText = () => {
    const r = repoRef.current;
    if (!r || !r.exists) return '(~) $';
    if (r.head && r.head.branch) return `(${r.head.branch}) $`;
    return '(detached) $';
  };

  const run = (raw) => {
    const c = (raw || '').trim();
    if (!c) return;
    if (tab !== 'sandbox' && !isFree) setTab('sandbox');
    if (c === 'clear') { setTerm([]); setInput(''); return; }
    const echo = { text: `${promptText()} ${c}`, color: '#F5F6F8' };
    const res = GitSim.exec(repoRef.current, c);
    const lines = res.lines.map((l) => ({ text: l.t, color: TERM_COLORS[l.k] || TERM_COLORS.out }));
    setTerm((prev) => [...prev, echo, ...lines].slice(-60));
    setInput('');
    setTick((t) => t + 1);
    requestAnimationFrame(() => { if (termRef.current) termRef.current.scrollTop = 1e6; });
  };

  const play = () => {
    if (playT.current) clearTimeout(playT.current);
    setPhase('before');
    setPlaying(true);
    playT.current = setTimeout(() => {
      setPhase('after');
      playT.current = setTimeout(() => setPlaying(false), 900);
    }, 720);
  };

  const resetRepo = () => {
    repoRef.current = GitSim.seed((cmd && cmd.sandboxSeed) || 'freeplay');
    setTick((t) => t + 1);
  };

  const openCommand = (id) => { setSideOpen(false); navigate(id === 'free' ? '/free' : `/commands/${id}`); };
  const goHome = () => { setSideOpen(false); navigate('/'); };

  // ---- derived view data ----
  const groups = listByCategory(content);
  const total = content.commands.length;
  const learnedCount = Object.keys(learned).filter((k) => learned[k]).length;
  const progressPct = total ? Math.round((learnedCount / total) * 100) : 0;
  const idx = cmd ? content.commands.findIndex((c) => c.id === cmd.id) : -1;
  const isLesson = tab === 'lesson' && !isFree;
  const isSandbox = tab === 'sandbox' || isFree;

  const lesson = useMemo(() => {
    if (!cmd) return null;
    const state = phase === 'before' ? cmd.beforeGraph : cmd.afterGraph;
    const g = GVGraph.layout(state, { accent: ACCENT, dark });
    const seen = {};
    const legend = [];
    for (const st of [cmd.beforeGraph, cmd.afterGraph]) {
      for (const rf of st.refs || []) {
        if (rf.kind === 'head' || rf.kind === 'remote-url' || seen[rf.name]) continue;
        seen[rf.name] = true;
        legend.push({ text: rf.name, color: rf.kind === 'remote' ? 'var(--gv-muted)' : rf.kind === 'tag' ? '#0E9488' : GVGraph.laneColor(rf.lane ?? 0, ACCENT) });
      }
    }
    return { g, legend: legend.slice(0, 4) };
  }, [cmd, phase, dark]);

  const live = useMemo(
    () => GitSim.layout(repoRef.current, { accent: ACCENT, showHashes: true, dark }),
    [tick, dark, commandId] // eslint-disable-line react-hooks/exhaustive-deps
  );

  const repo = repoRef.current;
  const statusText = repo && repo.exists
    ? [`working: ${repo.working.length ? repo.working.join(', ') : '—'}`, `staged: ${repo.staged.length ? repo.staged.join(', ') : '—'}`, ...(repo.stash ? ['stash: 1'] : [])].join('   ·   ')
    : null;
  const tryCmds = cmd ? cmd.syntax.slice(0, 3) : ['git commit -m "hello"', 'git checkout -b idea', 'help'];

  const segStyle = (on) => ({
    padding: '6px 15px', fontSize: 12.5, fontWeight: 600, borderRadius: 7, cursor: 'pointer',
    background: on ? 'var(--gv-card)' : 'transparent', color: on ? 'var(--gv-ink)' : 'var(--gv-muted)',
    boxShadow: on ? '0 1px 3px rgba(0,0,0,.1)' : 'none',
  });
  const tabStyle = (on) => ({
    padding: '9px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer', borderRadius: '9px 9px 0 0',
    color: on ? 'var(--gv-ink)' : 'var(--gv-muted)', borderBottom: on ? `2px solid ${ACCENT}` : '2px solid transparent',
  });

  return (
    <>
      <div className="gv-workrow" style={{ display: 'flex', flexWrap: 'wrap', minHeight: '100vh' }}>
        {/* mobile top bar */}
        <div className="gv-topbar">
          <div onClick={() => setSideOpen((o) => !o)} style={{ fontSize: 18, lineHeight: 1, cursor: 'pointer', padding: '6px 10px', border: '1px solid var(--gv-border)', borderRadius: 8, background: 'var(--gv-card)', userSelect: 'none' }}>☰</div>
          <div onClick={goHome} style={{ fontWeight: 700, fontSize: 15, letterSpacing: '-.02em', cursor: 'pointer' }}>
            Git<span style={{ color: 'var(--gv-accent)', padding: '0 2.5px', letterSpacing: 0 }}>·</span>Visualizer
          </div>
          <ThemeButton dark={dark} onToggle={toggleTheme} style={{ marginLeft: 'auto', padding: '6px 9px' }} />
        </div>
        {sideOpen && <div className="gv-backdrop" onClick={() => setSideOpen(false)} />}

        {/* sidebar */}
        <div className={`gv-sidebar${sideOpen ? ' gv-open' : ''}`} style={{ flex: '0 0 210px', borderRight: '1px solid var(--gv-border)', background: 'var(--gv-bg2)', display: 'flex', flexDirection: 'column', padding: '24px 0 20px' }}>
          <div onClick={goHome} style={{ padding: '0 20px 4px', fontWeight: 700, fontSize: 15, letterSpacing: '-.02em', cursor: 'pointer' }}>
            Git<span style={{ color: 'var(--gv-accent)', padding: '0 2.5px', letterSpacing: 0 }}>·</span>Visualizer
          </div>
          <div onClick={goHome} className="hv-text2" style={{ padding: '2px 20px 14px', fontSize: 12, color: 'var(--gv-muted)', cursor: 'pointer' }}>‹ All commands</div>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            {groups.map((g) => {
              const hasActive = !isFree && cmd && g.commands.some((c) => c.id === cmd.id);
              const expanded = openCats[g.category] != null ? openCats[g.category] : hasActive;
              return (
                <div key={g.category}>
                  <div onClick={() => setOpenCats((oc) => ({ ...oc, [g.category]: !expanded }))} className="hv-text2" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 10.5, letterSpacing: '.12em', color: 'var(--gv-muted)', padding: '12px 20px 4px', fontWeight: 600, cursor: 'pointer', userSelect: 'none' }}>
                    <span>{g.category.toUpperCase()}</span>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                      <span style={{ fontSize: 9.5, letterSpacing: 0, color: 'var(--gv-dim)' }}>{g.commands.length}</span>
                      <span style={{ fontSize: 9 }}>{expanded ? '▾' : '▸'}</span>
                    </span>
                  </div>
                  {expanded && g.commands.map((c) => {
                    const active = !isFree && cmd && cmd.id === c.id;
                    return (
                      <div key={c.id} onClick={() => openCommand(c.id)} className="hv-ink" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: active ? '6px 20px 6px 17px' : '6px 20px', fontSize: 12.5, cursor: 'pointer', fontFamily: MONO, color: active ? 'var(--gv-ink)' : 'var(--gv-text2)', fontWeight: active ? 600 : 400, background: active ? 'var(--gv-active)' : 'transparent', borderLeft: active ? `3px solid ${ACCENT}` : '3px solid transparent' }}>
                        <span>{c.title.replace(/^git /, '')}</span>
                        {learned[c.id] && <span style={{ color: '#0E9488', fontSize: 11 }}>✓</span>}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
          <div onClick={() => openCommand('free')} className="hv-border" style={{ margin: '14px 16px 12px', fontSize: 12.5, fontWeight: 600, color: isFree ? 'var(--gv-ink)' : 'var(--gv-text2)', background: isFree ? 'var(--gv-active)' : 'var(--gv-card)', border: '1px solid var(--gv-border)', borderRadius: 8, padding: '8px 12px', cursor: 'pointer', textAlign: 'center' }}>
            Free play →
          </div>
          <div style={{ padding: '0 20px' }}>
            <div style={{ fontSize: 11.5, color: 'var(--gv-muted)', marginBottom: 6 }}>{learnedCount} of {total} visited</div>
            <div style={{ height: 4, borderRadius: 2, background: 'var(--gv-border)', overflow: 'hidden' }}>
              <div style={{ width: `${progressPct}%`, height: '100%', background: 'var(--gv-accent)', transition: 'width .5s ease' }} />
            </div>
            <div onClick={requestReset} title="Clear all visited checkmarks" className="hv-red" style={{ marginTop: 9, fontSize: 11, color: 'var(--gv-muted)', cursor: 'pointer', userSelect: 'none' }}>
              ↺ Reset progress
            </div>
          </div>
        </div>

        {/* main */}
        <div className="gv-main" style={{ flex: '1 1 540px', minWidth: 0, padding: '34px 40px 26px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, flexWrap: 'wrap' }}>
              <div style={{ fontSize: 12, letterSpacing: '.14em', color: 'var(--gv-muted)', fontWeight: 600 }}>
                {cmd ? `${cmd.category.toUpperCase()} — ${idx + 1} OF ${total}` : 'SANDBOX — NO RAILS'}
              </div>
            </div>
            <div className="gv-cmd-title" style={{ fontFamily: MONO, fontSize: 30, fontWeight: 600, letterSpacing: '-.02em', lineHeight: 1.1 }}>
              {cmd ? cmd.title : 'Free play'}
            </div>
            <div style={{ fontSize: 15.5, lineHeight: 1.6, color: 'var(--gv-text2)', maxWidth: 600, marginTop: 12 }}>
              {cmd ? cmd.shortExplanation : 'A live repository with every command unlocked. Type below and watch the graph react.'}
            </div>
          </div>

          {/* tabs */}
          <div style={{ display: 'flex', gap: 6, borderBottom: '1px solid var(--gv-border)' }}>
            <div onClick={() => !isFree && setTab('lesson')} style={tabStyle(isLesson)}>Before → After</div>
            <div onClick={() => setTab('sandbox')} style={tabStyle(isSandbox)}>Live sandbox</div>
          </div>

          {/* LESSON TAB */}
          {isLesson && lesson && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <div style={{ display: 'inline-flex', background: 'var(--gv-seg)', borderRadius: 9, padding: 3 }}>
                  <div onClick={() => setPhase('before')} style={segStyle(phase === 'before')}>Before</div>
                  <div onClick={() => setPhase('after')} style={segStyle(phase === 'after')}>After</div>
                </div>
                <div onClick={play} className="hv-bright" style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: '#fff', background: ACCENT, borderRadius: 9, padding: '8px 15px', cursor: 'pointer' }}>
                  ▶ Play transition
                </div>
                <div style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, color: 'var(--gv-muted)' }}>
                  {phase === 'before' ? 'STATE: BEFORE' : 'STATE: AFTER'}
                </div>
              </div>

              <div style={{ minHeight: 250, background: 'var(--gv-card)', border: '1px solid var(--gv-border)', borderRadius: 14, padding: '8px 14px 12px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: 14, padding: '8px 4px 0' }}>
                  {lesson.legend.map((lg, i) => (
                    <span key={i} style={{ fontFamily: MONO, fontSize: 11, color: lg.color }}>● {lg.text}</span>
                  ))}
                  {(lesson.g.floating || []).map((fl, i) => (
                    <span key={`f${i}`} style={{ fontFamily: MONO, fontSize: 11, color: 'var(--gv-text2)', border: '1px dashed var(--gv-muted)', borderRadius: 6, padding: '2px 8px' }}>{fl.name}</span>
                  ))}
                </div>
                {lesson.g.empty ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 200 }}>
                    <div style={{ border: '1.5px dashed var(--gv-dash)', borderRadius: 14, padding: '22px 34px', color: 'var(--gv-muted)', fontSize: 13.5, fontFamily: MONO }}>
                      {lesson.g.emptyMsg}
                    </div>
                  </div>
                ) : (
                  <LessonGraph layout={lesson.g} animate={playing} />
                )}
                {(lesson.g.areas || []).length > 0 && (
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', padding: '6px 4px 2px', borderTop: '1px solid var(--gv-border2)', marginTop: 4 }}>
                    {lesson.g.areas.map((ar) => (
                      <div key={ar.key} style={{ flex: 1, minWidth: 150, background: 'var(--gv-area)', border: '1px solid var(--gv-border2)', borderRadius: 10, padding: '9px 12px' }}>
                        <div style={{ fontSize: 10, letterSpacing: '.1em', color: 'var(--gv-muted)', fontWeight: 600, marginBottom: 7 }}>{ar.title}</div>
                        {ar.empty && <div style={{ fontFamily: MONO, fontSize: 11.5, color: 'var(--gv-dim)' }}>— empty —</div>}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {ar.items.map((it, i) => (
                            <div key={i} style={areaChipStyle(it.tone)}>{(it.del ? '− ' : '') + it.name}</div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div style={{ padding: '8px 6px 2px', fontSize: 13, lineHeight: 1.55, color: 'var(--gv-text2)', minHeight: 20 }}>{lesson.g.caption}</div>
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: 'var(--gv-muted)', fontWeight: 600, letterSpacing: '.08em' }}>SYNTAX:</span>
                {cmd.syntax.map((s, i) => (
                  <div key={i} onClick={() => run(s)} title="Try in sandbox" className="hv-accent" style={{ fontFamily: MONO, fontSize: 12, color: 'var(--gv-accent)', background: 'var(--gv-card)', border: '1px solid var(--gv-border)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer' }}>
                    {s}
                  </div>
                ))}
              </div>
            </>
          )}

          {/* SANDBOX TAB */}
          {isSandbox && (
            <>
              <div style={{ minHeight: 230, background: 'var(--gv-card)', border: '1px solid var(--gv-border)', borderRadius: 14, padding: '8px 14px 12px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
                <div style={{ display: 'flex', gap: 14, padding: '8px 4px 0' }}>
                  {(live.legend || []).map((lg, i) => (
                    <span key={i} style={{ fontFamily: MONO, fontSize: 11, color: lg.color }}>● {lg.text}</span>
                  ))}
                  <div onClick={resetRepo} className="hv-border" style={{ marginLeft: 'auto', fontFamily: MONO, fontSize: 11, color: 'var(--gv-text2)', border: '1px solid var(--gv-border)', borderRadius: 6, padding: '4px 10px', cursor: 'pointer' }}>
                    ↺ reset
                  </div>
                </div>
                {live.empty ? (
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 170 }}>
                    <div style={{ border: '1.5px dashed var(--gv-dash)', borderRadius: 14, padding: '20px 30px', color: 'var(--gv-muted)', fontSize: 13, fontFamily: MONO }}>
                      {!repo || !repo.exists ? (repo && repo.cloneable ? 'try: git clone <url>' : 'try: git init') : 'git add . then git commit'}
                    </div>
                  </div>
                ) : (
                  <LiveGraph layout={live} />
                )}
                {statusText && <div style={{ fontFamily: MONO, fontSize: 11, color: 'var(--gv-muted)', padding: '4px 6px 0' }}>{statusText}</div>}
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <span style={{ fontSize: 11.5, color: 'var(--gv-muted)', fontWeight: 600, letterSpacing: '.08em' }}>TRY:</span>
                {tryCmds.map((t, i) => (
                  <div key={i} onClick={() => run(t)} className="hv-accent" style={{ fontFamily: MONO, fontSize: 12, color: 'var(--gv-accent)', background: 'var(--gv-card)', border: '1px solid var(--gv-border)', borderRadius: 7, padding: '5px 11px', cursor: 'pointer' }}>
                    {t}
                  </div>
                ))}
              </div>

              <div onClick={(e) => { const b = e.currentTarget.querySelector('input'); if (b) b.focus(); }} style={{ background: 'var(--gv-term)', borderRadius: 12, padding: '14px 20px', boxShadow: '0 8px 24px rgba(23,27,38,.14)', cursor: 'text' }}>
                <div ref={termRef} style={{ maxHeight: 120, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 8 }}>
                  {term.map((ln, i) => (
                    <div key={i} style={{ fontFamily: MONO, fontSize: 12.5, lineHeight: 1.5, color: ln.color, whiteSpace: 'pre-wrap' }}>{ln.text}</div>
                  ))}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontFamily: MONO, fontSize: 13, color: '#8FD3C7', flex: 'none' }}>{promptText()}</span>
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') run(input); }}
                    placeholder="type a git command… (or 'help')"
                    spellCheck={false}
                    autoComplete="off"
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#F5F6F8', fontFamily: MONO, fontSize: 13, caretColor: ACCENT }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        {/* right column */}
        <div className="gv-right" style={{ flex: '1 1 280px', maxWidth: 336, minWidth: 270, padding: '34px 28px 24px 6px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="gv-theme-row" style={{ display: 'flex', justifyContent: 'flex-end', margin: '-6px 0 -8px' }}>
            <ThemeButton dark={dark} onToggle={toggleTheme} />
          </div>
          {cmd ? (
            <>
              <div style={{ background: 'var(--gv-card)', border: '1px solid var(--gv-border)', borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--gv-muted)', fontWeight: 600, marginBottom: 12 }}>HOW IT WORKS</div>
                <div style={{ fontSize: 13.5, lineHeight: 1.65, color: 'var(--gv-text2)' }}>{cmd.howItWorks}</div>
              </div>
              <div style={{ background: 'var(--gv-active)', borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--gv-accent)', fontWeight: 600, marginBottom: 12 }}>HINTS</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {cmd.hints.map((h, i) => (
                    <div key={i} style={{ display: 'flex', gap: 9 }}>
                      <div style={{ color: 'var(--gv-accent)', fontSize: 13, flex: 'none', lineHeight: 1.55 }}>›</div>
                      <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--gv-text2)' }}>{fmt(h, 'var(--gv-card)')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <div style={{ background: 'var(--gv-card)', border: '1px solid var(--gv-border)', borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--gv-muted)', fontWeight: 600, marginBottom: 12 }}>COMMAND REFERENCE</div>
                <div style={{ fontFamily: MONO, fontSize: 12, lineHeight: 2, color: 'var(--gv-text2)' }}>
                  git init · add · commit -m<br />git status · log · branch<br />git checkout · switch · merge<br />git rebase · cherry-pick<br />git reset · revert · stash · tag<br />git remote add · push · pull<br />git fetch · clone
                </div>
              </div>
              <div style={{ background: 'var(--gv-active)', borderRadius: 14, padding: '20px 22px' }}>
                <div style={{ fontSize: 11, letterSpacing: '.14em', color: 'var(--gv-accent)', fontWeight: 600, marginBottom: 10 }}>NO RAILS</div>
                <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--gv-text2)' }}>
                  Anything goes. Faded nodes are unreachable commits — proof that Git rarely deletes anything. Reset the graph anytime.
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </>
  );
}
