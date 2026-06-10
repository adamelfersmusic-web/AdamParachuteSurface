import { useEffect, useRef, useState } from "react";
import { inlineText, pileLines } from "../deck";
import { HORIZONS } from "../types";
import type { Deck } from "../useDeck";

// The morning sorting room — the one room allowed to be denser, because the
// pile + canvas + card-targets are ONE motion: pull → arrange → commit.
// Tap a pile line to pull it into the canvas; tap a canvas line to commit it to
// a column. No drag — reliable, works on mobile.
export function WorkspaceView({ d }: { d: Deck }) {
  const pile = pileLines(d.runningContent);
  const [text, setText] = useState(d.scratchContent);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) setText(d.scratchContent);
  }, [d.scratchContent]);

  function save(next: string) {
    setText(next);
    d.saveScratch(next);
  }

  function pull(line: string) {
    const next = (text.trim() ? text.replace(/\s+$/, "") + "\n" : "") + line;
    save(next);
  }

  const commitLines = text
    .split(/\r?\n/)
    .map((l) => inlineText(l.replace(/^[-*]\s+\[[ xX]\]\s+/, "").replace(/^[-*]\s+/, "")))
    .filter((l) => l && !/^#{1,6}\s/.test(l));

  function count(h: "today" | "week" | "later") {
    return d.cards.filter((c) => !c.done && c.horizon === h).length;
  }

  return (
    <div className="workspace">
      <div className="ws-targets">
        {HORIZONS.map((h) => (
          <span key={h.key} className="ws-target">
            {h.label} <b>{count(h.key)}</b>
          </span>
        ))}
      </div>

      <div className="ws-grid">
        <aside className="ws-pile">
          <div className="ws-col-label">The pile — tap to pull →</div>
          <div className="ws-pile-lines">
            {pile.length === 0 && <p className="muted">Pile's empty.</p>}
            {pile.map((line, i) => (
              <button key={i} className="ws-pile-line" onClick={() => pull(line)} title="Pull into the canvas">
                {line}
              </button>
            ))}
          </div>
        </aside>

        <div className="ws-canvas">
          <div className="ws-col-label">Workspace — arrange here, then commit ↓</div>
          <textarea
            className="ws-area"
            value={text}
            onChange={(e) => { setText(e.target.value); dirty.current = true; }}
            onBlur={() => { dirty.current = false; if (text !== d.scratchContent) d.saveScratch(text); }}
            placeholder="Pull from the pile, sit with it, sort what you're actually doing…"
          />

          {commitLines.length > 0 && (
            <div className="ws-commit">
              <div className="ws-col-label">Commit a line to a column:</div>
              {commitLines.map((line, i) => (
                <div key={i} className="ws-commit-row">
                  <span className="ws-commit-text">{line}</span>
                  <span className="ws-commit-targets">
                    {HORIZONS.map((h) => (
                      <button key={h.key} onClick={() => d.addCard(h.key, line)}>→ {h.label}</button>
                    ))}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
