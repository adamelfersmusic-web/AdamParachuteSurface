import { useState } from "react";
import { byOrder, type DeckCard } from "../deck";
import { HORIZON_LABEL, type Horizon } from "../types";
import type { Deck } from "../useDeck";
import { MiniBtn } from "./DeckView";

const OTHERS: Record<Horizon, Horizon[]> = {
  today: ["week", "later"],
  week: ["today", "later"],
  later: ["today", "week"],
};

// Click a horizon header on the deck → just that list, full screen.
export function HorizonFocus({
  d,
  horizon,
  setNow,
  onClose,
}: {
  d: Deck;
  horizon: Horizon;
  setNow: (card: DeckCard) => void;
  onClose: () => void;
}) {
  const [val, setVal] = useState("");
  const items = d.cards.filter((c) => c.horizon === horizon).sort(byOrder);

  return (
    <div className="overlay">
      <div className="overlay-inner">
        <div className="overlay-head">
          <h2 className={`overlay-title${horizon === "today" ? " accent" : ""}`}>
            {HORIZON_LABEL[horizon]}
          </h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">×</button>
        </div>

        {items.length === 0 && <p className="muted">Nothing here. Clean slate.</p>}

        {items.map((c) => (
          <div key={c.id} className={`focus-row${c.done ? " done" : ""}`}>
            <button className="dot big" onClick={() => d.toggleCard(c)} aria-label="toggle done" />
            <span className="focus-text">{c.text}</span>
            {!c.done && (
              <span className="row-tools">
                <MiniBtn title="Right Now" onClick={() => setNow(c)}>◎</MiniBtn>
                {OTHERS[horizon].map((dest) => (
                  <MiniBtn key={dest} title={`Move to ${dest}`} onClick={() => d.moveCard(c, dest)}>›</MiniBtn>
                ))}
                <MiniBtn title="Take off deck" onClick={() => d.removeCard(c)}>×</MiniBtn>
              </span>
            )}
          </div>
        ))}

        <input
          className="focus-add"
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && val.trim()) {
              d.addCard(horizon, val.trim());
              setVal("");
            }
          }}
          placeholder="+ add to this list"
        />
      </div>
    </div>
  );
}
