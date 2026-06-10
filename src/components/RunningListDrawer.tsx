import { useState } from "react";
import { pileLines } from "../deck";
import { TIERS, type Tier } from "../types";

// The pile. Flick a line onto the deck by tapping a tier — Moves / Must-dos /
// Errands. The line gets a soft ✓ so you can sweep the pile without losing your
// place; it stays in the pile (pulling is borrowing). "Edit raw" edits the note.
export function RunningListDrawer({
  content,
  onWrite,
  onClose,
  onPull,
  onNow,
}: {
  content: string;
  onWrite: (text: string) => void;
  onClose: () => void;
  onPull: (tier: Tier, text: string) => void;
  onNow: (text: string) => void;
}) {
  const [text, setText] = useState(content);
  const [pulled, setPulled] = useState<Set<string>>(new Set());
  const items = pileLines(text);

  function flick(tier: Tier, line: string) {
    onPull(tier, line);
    setPulled((p) => new Set(p).add(line));
  }

  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <h2>The pile</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>
        <p className="drawer-sub">Tap a tier to flick a line onto the deck. Leave the rest here.</p>

        <div className="drawer-lines">
          {items.length === 0 && <p className="muted">Empty. Add things with ✅ Quick To-Do.</p>}
          {items.map((line, i) => {
            const done = pulled.has(line);
            return (
              <div key={i} className={`flick-row${done ? " pulled" : ""}`}>
                <span className="flick-text">{done ? "✓ " : ""}{line}</span>
                <span className="flick-tiers">
                  <button className="flick-tier now-pill" onClick={() => onNow(line)} title="Do this now">→ Now</button>
                  {TIERS.map((t) => (
                    <button key={t.key} className="flick-tier" onClick={() => flick(t.key, line)} title={`Flick into ${t.label}`}>
                      {t.label}
                    </button>
                  ))}
                </span>
              </div>
            );
          })}
        </div>

        <details className="drawer-raw">
          <summary>Edit raw</summary>
          <textarea value={text} onChange={(e) => setText(e.target.value)} onBlur={() => onWrite(text)} rows={10} />
        </details>
      </aside>
    </>
  );
}
