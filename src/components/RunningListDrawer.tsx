import { useState } from "react";
import { HORIZONS, type Horizon } from "../types";

// The big list. Fish lines out of it onto the deck; leave the rest here.
// "Edit raw" writes the whole note back to the vault.
export function RunningListDrawer({
  content,
  onWrite,
  onClose,
  onPull,
}: {
  content: string;
  onWrite: (text: string) => void;
  onClose: () => void;
  onPull: (horizon: Horizon, text: string) => void;
}) {
  const [text, setText] = useState(content);
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*]\s+\[[ xX]\]\s+/, "").replace(/^[-*]\s+/, "").trim())
    .filter((l) => l);

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <h2>Running List</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="drawer-sub">The big list. Pull what matters into the deck — leave the rest here.</p>

        <div className="drawer-lines">
          {lines.length === 0 && <p className="muted">Empty. Add things with ✅ Quick To-Do.</p>}
          {lines.map((line, i) => (
            <div key={i} className="drawer-line">
              <span>{line}</span>
              <span className="drawer-pulls">
                {HORIZONS.map((h) => (
                  <button
                    key={h.key}
                    className="pull-deck"
                    title={`Pull into ${h.label}`}
                    onClick={() => onPull(h.key, line)}
                  >
                    {h.label}
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>

        <details className="drawer-raw">
          <summary>Edit raw</summary>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => onWrite(text)}
            rows={10}
          />
        </details>
      </aside>
    </>
  );
}
