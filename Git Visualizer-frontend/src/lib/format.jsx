export const ACCENT = '#2F6BD8';

/** Renders `code` and *bold* markers in content strings. */
export function fmt(str, codeBg) {
  const parts = String(str).split(/(`[^`]+`|\*[^*]+\*)/g);
  return (
    <span>
      {parts.map((p, i) => {
        if (p && p[0] === '`') {
          return (
            <span key={i} style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '0.92em', color: ACCENT, background: codeBg || 'var(--gv-active)', padding: '1px 6px', borderRadius: 5 }}>
              {p.slice(1, -1)}
            </span>
          );
        }
        if (p && p[0] === '*' && p.length > 2) {
          return <b key={i} style={{ color: 'var(--gv-ink)', fontWeight: 600 }}>{p.slice(1, -1)}</b>;
        }
        return p;
      })}
    </span>
  );
}

const AREA_TONES = {
  green: ['#E6F4F1', '#0E7A6E'], amber: ['#FBF0DF', '#9A6A17'], purple: ['#F1EBFE', '#6B45D6'],
  blue: ['#E9F1FD', '#2560C4'], muted: ['#EEF1F6', '#6B7488'], red: ['#FBE9EC', '#C13049'],
};

export function areaChipStyle(tone) {
  const c = AREA_TONES[tone] || AREA_TONES.muted;
  return { fontFamily: "'JetBrains Mono',monospace", fontSize: '11.5px', color: c[1], background: c[0], borderRadius: 6, padding: '3px 9px', alignSelf: 'flex-start' };
}
