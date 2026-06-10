import { useEffect, useRef, useState } from "react";
import { byOrder, type DeckCard } from "../deck";
import type { Deck } from "../useDeck";

export interface NowTask {
  text: string;
  cardId?: string;
}

// One thing, full screen. You arrive here by focusing a Move (◎). Pick-only —
// candidates are your Moves. The held line is the trust signal; the notes field
// is room to work the one thing. Capture still floats in the corner (global).
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
  const moves = d.cards.filter((c) => !c.done && c.tier === "move").sort(byOrder);
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
          <button className="btn-soft" onClick={() => { setNowTask(null); setPicking(true); }}>Pick another</button>
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
      <p className="now-caption">From your Moves — pick one to focus on.</p>
      {moves.length === 0 && <p className="muted">No Moves yet. Add a needle-mover to the deck first.</p>}
      {moves.map((c) => (
        <button
          key={c.id}
          className="now-option"
          onClick={() => { setNowTask({ text: c.text, cardId: c.id }); setPicking(false); }}
        >
          {c.text}
        </button>
      ))}
      {moves.length > 0 && (
        <p className="held-line">{held} held and waiting — nothing's lost.</p>
      )}
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
