export default function ResetModal({ onConfirm, onCancel }) {
  return (
    <div onClick={onCancel} style={{ position: 'fixed', inset: 0, background: 'rgba(23,27,38,.45)', zIndex: 80, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div onClick={(e) => e.stopPropagation()} style={{ background: 'var(--gv-card)', border: '1px solid var(--gv-border)', borderRadius: 16, padding: '26px 28px', maxWidth: 420, width: '100%', boxShadow: '0 24px 64px rgba(23,27,38,.25)', animation: 'gvFade .18s ease both' }}>
        <div style={{ fontWeight: 700, fontSize: 17, letterSpacing: '-.01em' }}>Reset your progress?</div>
        <div style={{ fontSize: 14, lineHeight: 1.6, color: 'var(--gv-text2)', marginTop: 10 }}>
          All visited checkmarks will be cleared. This only affects this browser — nothing is stored on a server.
        </div>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 22 }}>
          <div onClick={onCancel} className="hv-border" style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--gv-text2)', background: 'var(--gv-card)', border: '1px solid var(--gv-border)', borderRadius: 9, padding: '9px 18px', cursor: 'pointer' }}>
            Cancel
          </div>
          <div onClick={onConfirm} className="hv-bright" style={{ fontSize: 13.5, fontWeight: 600, color: '#fff', background: '#C13049', borderRadius: 9, padding: '9px 18px', cursor: 'pointer' }}>
            ↺ Reset progress
          </div>
        </div>
      </div>
    </div>
  );
}
