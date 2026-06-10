import { useEffect, useRef, useState } from "react";
import { byOrder, type DeckCard } from "../deck";
import type { Deck } from "../useDeck";

// One thing, full screen. The current Do Now PERSISTS (a flag on the card) — it
// stays until you mark it done or promote a new one, and it follows you across
// refreshes and devices. When nothing's focused, the picker surfaces your Moves.
export function RightNow({ d }: { d: Deck }) {
  const card = d.nowCard;
  const moves = d.cards.filter((c) => !c.done && c.tier === "move").sort(byOrder);
  const held = d.cards.filter((c) => !c.done && c.id !== card?.id).length;

  if (card) {
    return (
      <div className="now-focus">
        <span className="now-eyebrow">RIGHT NOW</span>
        <h2 className="now-task">{card.text}</h2>
        <div className="now-actions">
          <button className="btn-soft" onClick={() => d.clearNow(card)}>Pick another</button>
          <button className="btn-accent" onClick={() => d.markNowDone(card)}>Done</button>
        </div>
        <p className="held-line">
          {held === 0
            ? "Nothing else waiting. You're clear."
            : `${held} other ${held === 1 ? "thing" : "things"} held and waiting — nothing's lost.`}
        </p>
        <NotesField card={card} onSave={(notes) => d.saveCardNotes(card, notes)} />
      </div>
    );
  }

  return (
    <div className="now-pick">
      <span className="now-eyebrow">RIGHT NOW</span>
      <h2 className="now-pick-title">Pick the one thing.</h2>
      <p className="now-caption">Your Moves — or promote anything from anywhere with → Now.</p>
      {moves.length === 0 && <p className="muted">No Moves yet. Promote anything to Do Now with → Now.</p>}
      {moves.map((c) => (
        <button key={c.id} className="now-option" onClick={() => d.promoteNow(c)}>{c.text}</button>
      ))}
      {held > 0 && <p className="held-line">{held} held and waiting — nothing's lost.</p>}
    </div>
  );
}

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
