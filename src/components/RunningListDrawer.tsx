import { useState } from "react";
import type { Horizon } from "../types";

// The pile. The flick (pile → day) is the heartbeat of the whole app, so it's
// one frictionless tap: the line is the button — tap it, it's on Today, done.
// "Wk"/"Later" are quiet secondary targets. Flicked lines get a soft ✓ so you
// can sweep straight down the pile without losing your place. The line stays in
// the pile — pulling is borrowing, not moving.
//
// (Structured so a future "suggested for today" filter can pre-sort/flag the
// `items` array without touching this component's interaction.)
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
  const [pulled, setPulled] = useState<Set<string>>(new Set());

  const items = text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[-*]\s+\[[ xX]\]\s+/, "").replace(/^[-*]\s+/, "").trim())
    .filter((l) => l);

  function flick(horizon: Horizon, line: string) {
    onPull(horizon, line);
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
        <p className="drawer-sub">Tap a line to flick it into <strong>Today</strong>. Leave the rest here.</p>

        <div className="drawer-lines">
          {items.length === 0 && <p className="muted">Empty. Add things with ✅ Quick To-Do.</p>}
          {items.map((line, i) => {
            const done = pulled.has(line);
            return (
              <div key={i} className={`flick-row${done ? " pulled" : ""}`}>
                <button className="flick-main" onClick={() => flick("today", line)} title="Flick into Today">
                  <span className="flick-check">{done ? "✓" : "→"}</span>
                  <span className="flick-text">{line}</span>
                  {done && <span className="flick-tag">on Today</span>}
                </button>
                <span className="flick-alts">
                  <button onClick={() => flick("week", line)} title="This Week">Wk</button>
                  <button onClick={() => flick("later", line)} title="Later">Later</button>
                </span>
              </div>
            );
          })}
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
