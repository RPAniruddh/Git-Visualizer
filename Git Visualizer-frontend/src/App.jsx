import { useCallback, useEffect, useState } from 'react';
import { Route, Routes, useParams } from 'react-router-dom';
import { loadContent } from './api.js';
import Landing from './components/Landing.jsx';
import Workspace from './components/Workspace.jsx';
import ErrorScreen from './components/ErrorScreen.jsx';
import ResetModal from './components/ResetModal.jsx';
import NotFound from './components/NotFound.jsx';

function readLearned() {
  try { return JSON.parse(localStorage.getItem('gv-learned-v2') || '{}'); } catch { return {}; }
}

function readDark() {
  try { return localStorage.getItem('gv-theme') === 'dark'; } catch { return false; }
}

export default function App() {
  const [content, setContent] = useState(null);
  const [error, setError] = useState(null);
  const [dark, setDark] = useState(readDark);
  const [learned, setLearned] = useState(readLearned);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadContent()
      .then((c) => { if (!cancelled) setContent(c); })
      .catch((e) => { if (!cancelled) setError(e); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('gv-dark', dark);
    try { localStorage.setItem('gv-theme', dark ? 'dark' : 'light'); } catch {}
  }, [dark]);

  const toggleTheme = useCallback(() => setDark((d) => !d), []);

  const markLearned = useCallback((id) => {
    setLearned((prev) => {
      if (prev[id]) return prev;
      const next = { ...prev, [id]: true };
      try { localStorage.setItem('gv-learned-v2', JSON.stringify(next)); } catch {}
      return next;
    });
  }, []);

  const doReset = useCallback(() => {
    try { localStorage.removeItem('gv-learned-v2'); } catch {}
    setLearned({});
    setConfirmReset(false);
  }, []);

  if (error) return <ErrorScreen error={error} />;
  if (!content) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--gv-muted)', fontSize: 14 }}>
        Loading command library…
      </div>
    );
  }

  const shared = { content, dark, toggleTheme, learned, markLearned, requestReset: () => setConfirmReset(true) };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--gv-bg)' }}>
      {confirmReset && <ResetModal onConfirm={doReset} onCancel={() => setConfirmReset(false)} />}
      <Routes>
        <Route path="/" element={<Landing {...shared} />} />
        <Route path="/commands/:id" element={<CommandRoute shared={shared} />} />
        <Route path="/free" element={<Workspace {...shared} commandId="free" />} />
        <Route path="*" element={<NotFound dark={dark} toggleTheme={toggleTheme} />} />
      </Routes>
    </div>
  );
}

function CommandRoute({ shared }) {
  const { id } = useParams();
  const exists = shared.content.commands.some((c) => c.id === id);
  if (!exists) return <NotFound dark={shared.dark} toggleTheme={shared.toggleTheme} />;
  return <Workspace {...shared} commandId={id} key={id} />;
}
