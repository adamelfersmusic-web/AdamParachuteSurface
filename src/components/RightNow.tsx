import { useEffect, useRef, useState } from "react";
import { byOrder, type DeckCard } from "../deck";
import type { Deck } from "../useDeck";

export interface NowTask {
  text: string;
  cardId?: string;
}

// One thing, full screen. Pick-only: the candidates are your TODAY cards — Right
// Now never creates a task, it just asks "which of Today am I doing now?" The
// held signal is the trust signal; the notes field is room to work the one thing.
export function RightNow({
  d,
  nowTask,
  setNowTask,
}: {
  d: Deck;
  nowTask: NowTask | null;
  setNowTask: (t: NowTask | null) => void;
}) {
  const [picking, setPicking] = useState(!nowTask);
  const today = d.cards.filter((c) => !c.done && c.horizon === "today").sort(byOrder);
  const held = d.cards.filter((c) => !c.done && c.id !== nowTask?.cardId).length;
  const card = nowTask?.cardId ? d.cards.find((c) => c.id === nowTask.cardId) ?? null : null;

  function finish() {
    if (card && !card.done) d.toggleCard(card);
    setNowTask(null);
    setPicking(true);
  }

  if (nowTask && !picking) {
    return (
      <div className="now-focus">
        <span className="now-eyebrow">RIGHT NOW</span>
        <h2 className="now-task">{nowTask.text}</h2>
        <div className="now-actions">
          <button className="btn-soft" onClick={() => { setNowTask(null); setPicking(true); }}>
            Pick another
          </button>
          <button className="btn-accent" onClick={finish}>Done</button>
        </div>
        <p className="held-line">
          {held === 0
            ? "Nothing else waiting. You're clear."
            : `${held} other ${held === 1 ? "thing" : "things"} held and waiting — nothing's lost.`}
        </p>
        {card && <NotesField card={card} onSave={(notes) => d.saveCardNotes(card, notes)} />}
      </div>
    );
  }

  return (
    <div className="now-pick">
      <span className="now-eyebrow">RIGHT NOW</span>
      <h2 className="now-pick-title">Pick the one thing.</h2>
      <p className="now-caption">From Today — pick one to focus on.</p>
      {today.length === 0 && <p className="muted">Nothing on Today yet. Flick something in from the pile.</p>}
      {today.map((c) => (
        <button
          key={c.id}
          className="now-option"
          onClick={() => { setNowTask({ text: c.text, cardId: c.id }); setPicking(false); }}
        >
          {c.text}
        </button>
      ))}
      {today.length > 0 && (
        <p className="held-line">{today.length} on Today, held and waiting — nothing's lost.</p>
      )}
    </div>
  );
}

// Scratch space for the focused task, saved into the task's own note on blur.
function NotesField({ card, onSave }: { card: DeckCard; onSave: (notes: string) => void }) {
  const [text, setText] = useState(card.notes);
  const dirty = useRef(false);

  useEffect(() => {
    if (!dirty.current) setText(card.notes);
  }, [card.notes]);

  return (
    <div className="now-notes">
      <div className="now-notes-label">Notes — sub-steps, where you're at</div>
      <textarea
        value={text}
        onChange={(e) => { setText(e.target.value); dirty.current = true; }}
        onBlur={() => { dirty.current = false; onSave(text); }}
        placeholder="Jot what you're thinking, the next sub-step, where you left off…"
      />
    </div>
  );
}
