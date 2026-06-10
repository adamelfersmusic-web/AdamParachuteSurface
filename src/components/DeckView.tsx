import { useState } from "react";
import { byOrder, type DeckCard } from "../deck";
import { HORIZONS, type Horizon } from "../types";
import type { Deck } from "../useDeck";

const OTHERS: Record<Horizon, Horizon[]> = {
  today: ["week", "later"],
  week: ["today", "later"],
  later: ["today", "week"],
};

export function DeckView({
  d,
  setNow,
  openHorizon,
}: {
  d: Deck;
  setNow: (card: DeckCard) => void;
  openHorizon: (h: Horizon) => void;
}) {
  return (
    <div className="deck-grid">
      {HORIZONS.map((h) => (
        <Column
          key={h.key}
          horizon={h.key}
          label={h.label}
          cards={d.cards.filter((c) => c.horizon === h.key).sort(byOrder)}
          d={d}
          setNow={setNow}
          openHorizon={openHorizon}
        />
      ))}
    </div>
  );
}

function Column({
  horizon,
  label,
  cards,
  d,
  setNow,
  openHorizon,
}: {
  horizon: Horizon;
  label: string;
  cards: DeckCard[];
  d: Deck;
  setNow: (card: DeckCard) => void;
  openHorizon: (h: Horizon) => void;
}) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState("");
  const openCount = cards.filter((c) => !c.done).length;

  function submit() {
    if (val.trim()) d.addCard(horizon, val.trim());
    setVal("");
    setAdding(false);
  }

  return (
    <section className="column">
      <div className="column-head">
        <h2
          className={`column-title${horizon === "today" ? " accent" : ""}`}
          onClick={() => openHorizon(horizon)}
          title="Open just this"
        >
          {label}
        </h2>
        <button className="column-expand" onClick={() => openHorizon(horizon)} title="Open just this">
          {openCount} ⤢
        </button>
      </div>

      {cards.length === 0 && <p className="column-empty">Nothing here yet.</p>}

      {cards.map((c) => (
        <div key={c.id} className={`card-row${c.done ? " done" : ""}`}>
          <button className="dot" onClick={() => d.toggleCard(c)} aria-label="toggle done" />
          <span className="card-text">{c.text}</span>
          {!c.done && (
            <span className="row-tools">
              <MiniBtn title="Set as Right Now" onClick={() => setNow(c)}>◎</MiniBtn>
              {OTHERS[horizon].map((dest) => (
                <MiniBtn key={dest} title={`Move to ${dest}`} onClick={() => d.moveCard(c, dest)}>›</MiniBtn>
              ))}
              <MiniBtn title="Take off deck" onClick={() => d.removeCard(c)}>×</MiniBtn>
            </span>
          )}
        </div>
      ))}

      {adding ? (
        <input
          className="add-input"
          autoFocus
          value={val}
          onChange={(e) => setVal(e.target.value)}
          onBlur={submit}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          placeholder="What goes here?"
        />
      ) : (
        <button className="add-btn" onClick={() => setAdding(true)}>+ add</button>
      )}
    </section>
  );
}

export function MiniBtn({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button className="mini-btn" {...rest}>
      {children}
    </button>
  );
}
