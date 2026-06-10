import { projectLines, projectSubtitle, projectTitle } from "../deck";
import type { Note } from "../types";

// The full project note, line by line. Hover any real line to pull it into Right
// Now or onto the deck. Headings/empties aren't pullable.
export function ProjectNote({
  note,
  onClose,
  onPullNow,
  onPullDeck,
}: {
  note: Note;
  onClose: () => void;
  onPullNow: (text: string) => void;
  onPullDeck: (text: string) => void;
}) {
  const lines = projectLines(note.content ?? "");

  return (
    <div className="overlay">
      <div className="overlay-inner wide">
        <div className="overlay-head">
          <div>
            <h2 className="overlay-title">{projectTitle(note)}</h2>
            <p className="overlay-sub">{projectSubtitle(note)}</p>
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        <p className="overlay-hint">Hover any line → send it to Right Now or the deck.</p>

        <div className="note-body">
          {lines.map((line, i) =>
            line.empty ? (
              <div key={i} className="note-line empty" />
            ) : (
              <div key={i} className={`note-line${line.heading ? " heading" : ""}`}>
                <span className="note-line-text">{line.raw.replace(/^#{1,6}\s+/, "")}</span>
                {!line.heading && line.text && (
                  <span className="line-actions">
                    <button className="pull-now" onClick={() => onPullNow(line.text)}>◎ now</button>
                    <button className="pull-deck" onClick={() => onPullDeck(line.text)}>→ deck</button>
                  </span>
                )}
              </div>
            ),
          )}
        </div>
      </div>
    </div>
  );
}
