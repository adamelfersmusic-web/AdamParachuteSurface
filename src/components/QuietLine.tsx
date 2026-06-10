import { looseEndLabel } from "../useDeck";
import type { Note } from "../types";

// The quiet channel: one soft whisper, never a nag. Surfaces the single oldest
// thing tagged loose-end/admin. Act on it (pulls it to Today) or wave it on (it
// rotates to the next). No badges, no list of shame. Renders nothing when empty.
export function QuietLine({
  note,
  onHandle,
  onDismiss,
}: {
  note: Note | null;
  onHandle: (note: Note) => void;
  onDismiss: (note: Note) => void;
}) {
  if (!note) return null;
  return (
    <div className="quiet-line">
      <span className="quiet-text">
        <span className="quiet-eyebrow">been sitting a while</span>
        {looseEndLabel(note)}
      </span>
      <span className="quiet-actions">
        <button className="quiet-handle" onClick={() => onHandle(note)}>I'll handle it</button>
        <button className="quiet-dismiss" onClick={() => onDismiss(note)}>not now</button>
      </span>
    </div>
  );
}
