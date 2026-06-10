import { useState } from "react";
import { byOrder } from "../deck";
import type { Deck } from "../useDeck";

export interface NowTask {
  text: string;
  cardId?: string;
}

// One thing, full screen. Pick from the deck's open cards (or arrive here with a
// line pulled from a project). The "held" signal is the point: everything else
// is provably safe to ignore, so the working memory can let go and hyperfocus.
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
  const open = d.cards.filter((c) => !c.done).sort(byOrder);
  const held = open.filter((c) => c.id !== nowTask?.cardId).length;

  function finish() {
    if (nowTask?.cardId) {
      const card = d.cards.find((c) => c.id === nowTask.cardId);
      if (card && !card.done) d.toggleCard(card);
    }
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
            : `${held} other ${held === 1 ? "thing" : "things"} held — you're clear to focus.`}
        </p>
      </div>
    );
  }

  return (
    <div className="now-pick">
      <span className="now-eyebrow">RIGHT NOW</span>
      <h2 className="now-pick-title">Pick the one thing.</h2>
      {open.length === 0 && <p className="muted">Nothing on the deck. Flick something in from the pile.</p>}
      {open.map((c) => (
        <button
          key={c.id}
          className="now-option"
          onClick={() => { setNowTask({ text: c.text, cardId: c.id }); setPicking(false); }}
        >
          {c.text}
        </button>
      ))}
      {open.length > 0 && (
        <p className="held-line">{open.length} {open.length === 1 ? "thing" : "things"} held and waiting — nothing's lost.</p>
      )}
    </div>
  );
}
