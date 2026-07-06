export default function ThemeButton({ dark, onToggle, style }) {
  return (
    <div
      onClick={onToggle}
      title="Toggle dark theme"
      className="hv-border"
      style={{ fontSize: 14, lineHeight: 1, cursor: 'pointer', border: '1px solid var(--gv-border)', borderRadius: 8, padding: '7px 9px', background: 'var(--gv-card)', userSelect: 'none', ...style }}
    >
      {dark ? '☀' : '🌙'}
    </div>
  );
}
