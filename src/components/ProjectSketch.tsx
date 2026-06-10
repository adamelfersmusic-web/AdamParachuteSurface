import { useEffect, useRef, useState } from "react";
import { projectSubtitle, projectTitle } from "../deck";
import type { Note } from "../types";

// Tapping a project opens THIS — the sketchpad: nearly-empty, my handwriting, the
// couple of moves I'm actually on. Calm. The full status note (the deep note)
// lives behind a quiet link, visited on purpose — never dumped on me.
export function ProjectSketch({
  project,
  sketch,
  onSave,
  onFlickToday,
  onFlickNow,
  onOpenDeep,
  onClose,
}: {
  project: Note;
  sketch: Note | null;
  onSave: (content: string) => void;
  onFlickToday: (text: string) => void;
  onFlickNow: (text: string) => void;
  onOpenDeep: () => void;
  onClose: () => void;
}) {
  const [content, setContent] = useState("");
  const [editing, setEditing] = useState(false);
  const focused = useRef(false);

  useEffect(() => {
    if (sketch && !focused.current) setContent(sketch.content ?? "");
  }, [sketch]);

  const lines = content.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const empty = lines.length === 0;

  function commit() {
    focused.current = false;
    setEditing(false);
    if (sketch && content !== (sketch.content ?? "")) onSave(content);
  }

  return (
    <div className="overlay">
      <div className="overlay-inner">
        <div className="overlay-head">
          <div>
            <h2 className="overlay-title">{projectTitle(project)}</h2>
            <p className="overlay-sub">{projectSubtitle(project)}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="sketch-label">
          <span>Current / next moves</span>
          {!editing && (
            <button className="sketch-edit" onClick={() => { setEditing(true); focused.current = true; }}>
              ✎ edit
            </button>
          )}
        </div>

        {!sketch ? (
          <p className="muted">Opening…</p>
        ) : editing || empty ? (
          <textarea
            className="sketch-area"
            autoFocus={editing}
            value={content}
            placeholder={`What are the 2–3 moves you're actually on for ${projectTitle(project)}?`}
            onFocus={() => { focused.current = true; }}
            onChange={(e) => setContent(e.target.value)}
            onBlur={commit}
          />
        ) : (
          <div className="sketch-lines">
            {lines.map((line, i) => (
              <div key={i} className="sketch-line">
                <span className="sketch-text">{line.replace(/^[-*]\s+/, "")}</span>
                <span className="line-actions">
                  <button className="pull-now" onClick={() => onFlickNow(line.replace(/^[-*]\s+/, ""))}>◎ now</button>
                  <button className="pull-deck" onClick={() => onFlickToday(line.replace(/^[-*]\s+/, ""))}>→ today</button>
                </span>
              </div>
            ))}
          </div>
        )}

        <button className="deep-link" onClick={onOpenDeep}>open full note →</button>
      </div>
    </div>
  );
}
