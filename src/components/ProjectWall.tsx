import { useEffect, useRef, useState } from "react";
import { projectLines, projectTitle } from "../deck";
import { HORIZONS, type Horizon } from "../types";
import type { Note } from "../types";

// Inside a project: the WALL (where it's at + next steps) — calm, editable, the
// main thing. A capture box that sends straight to the DECK (project tasks are
// already decided). And a quiet link to the full deep note, opened on purpose.
// The deep note is never edited here.
export function ProjectWall({
  wall,
  deep,
  onSaveWall,
  onFlickToday,
  onFlickNow,
  onCapture,
  onOpenDeep,
  onClose,
}: {
  wall: Note;
  deep: Note | null;
  onSaveWall: (content: string) => void;
  onFlickToday: (text: string) => void;
  onFlickNow: (text: string) => void;
  onCapture: (horizon: Horizon, text: string) => void;
  onOpenDeep: () => void;
  onClose: () => void;
}) {
  const [content, setContent] = useState(wall.content ?? "");
  const [editing, setEditing] = useState(false);
  const [task, setTask] = useState("");
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setContent(wall.content ?? "");
  }, [wall]);

  function commit() {
    focused.current = false;
    setEditing(false);
    if (content !== (wall.content ?? "")) onSaveWall(content);
  }

  const lines = projectLines(content);

  return (
    <div className="overlay">
      <div className="overlay-inner">
        <div className="overlay-head">
          <h2 className="overlay-title">{projectTitle(wall)}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <div className="sketch-label">
          <span>The wall — where it's at / next steps</span>
          {!editing && (
            <button className="sketch-edit" onClick={() => { setEditing(true); focused.current = true; }}>
              ✎ edit
            </button>
          )}
        </div>

        {editing ? (
          <textarea
            className="sketch-area"
            autoFocus
            value={content}
            placeholder={`Where is ${projectTitle(wall)} at? What are the next moves?`}
            onFocus={() => { focused.current = true; }}
            onChange={(e) => setContent(e.target.value)}
            onBlur={commit}
          />
        ) : (
          <div className="sketch-lines">
            {lines.filter((l) => !l.empty).length === 0 && (
              <p className="muted" style={{ padding: "8px 14px" }}>Empty. Tap ✎ edit to fill the wall.</p>
            )}
            {lines.map((line, i) =>
              line.empty ? null : line.heading ? (
                <div key={i} className="wall-heading">{line.raw.replace(/^#{1,6}\s+/, "")}</div>
              ) : (
                <div key={i} className="sketch-line">
                  <span className="sketch-text">{line.text}</span>
                  <span className="line-actions">
                    <button className="pull-now" onClick={() => onFlickNow(line.text)}>◎ now</button>
                    <button className="pull-deck" onClick={() => onFlickToday(line.text)}>→ today</button>
                  </span>
                </div>
              ),
            )}
          </div>
        )}

        <div className="proj-capture">
          <div className="sketch-label"><span>New task → straight to the deck</span></div>
          <input
            value={task}
            onChange={(e) => setTask(e.target.value)}
            placeholder="A next move for this project…"
          />
          <div className="proj-capture-targets">
            {HORIZONS.map((h) => (
              <button
                key={h.key}
                disabled={!task.trim()}
                onClick={() => { onCapture(h.key, task.trim()); setTask(""); }}
              >
                → {h.label}
              </button>
            ))}
          </div>
        </div>

        {deep && <button className="deep-link" onClick={onOpenDeep}>open full note →</button>}
      </div>
    </div>
  );
}
