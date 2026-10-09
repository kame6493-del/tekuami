import { useEffect, useRef, useState, type ReactNode } from 'react';
import { IconClose } from './icons';

/** 下から出る面。外側を押すか「閉じる」で閉じる */
export function Sheet({ open, onClose, tall, children }: { open: boolean; onClose: () => void; tall?: boolean; children: ReactNode }) {
  const [shown, setShown] = useState(open);
  const last = useRef<ReactNode>(children);
  if (open) last.current = children;
  useEffect(() => {
    if (open) setShown(true);
    else {
      const t = window.setTimeout(() => setShown(false), 220);
      return () => window.clearTimeout(t);
    }
  }, [open]);
  if (!shown && !open) return null;
  return (
    <div className={`sheet-wrap ${open ? 'is-open' : ''}`}>
      <div className="sheet-scrim" onClick={onClose} />
      <div className={`sheet ${tall ? 'sheet-tall' : ''}`} role="dialog" aria-modal="true">
        <div className="sheet-head">
          <span className="grabber" aria-hidden />
          <button className="icon-btn sheet-close" onClick={onClose} aria-label="閉じる">
            <IconClose />
          </button>
        </div>
        <div className="sheet-body">{open ? children : last.current}</div>
      </div>
    </div>
  );
}
