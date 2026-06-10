import { useEffect, useState } from "react";
import { byOrder, type DeckCard } from "../deck";
import { HORIZON_LABEL, TIERS, type Tier } from "../types";
import type { Deck } from "../useDeck";

// The deck, organized by TYPE + ENERGY: Moves (big), Must-dos (medium), Errands
// (quiet). Time is a small chip per card. Every card edits inline (tap the text);
// the ◎ focuses it in Right Now.
export function DeckView({ d, onFocus }: { d: Deck; onFocus: (card: DeckCard) => void }) {
  return (
    <div className="deck-tiers">
      {TIERS.map((tier) => {
        const items = d.cards.filter((c) => c.tier === tier.key).sort(byOrder);
        const open = items.filter((c) => !c.done).length;
        return (
          <section key={tier.key} className={`tier ${tier.key}`}>
            <div className="tier-head">
              <span className="tier-name">{tier.label}</span>
              <span className="energy">{tier.energy}</span>
              <span className="tier-meta">{tier.meta}</span>
              <span className="tier-count">{open}</span>
            </div>
            {items.length === 0 && <div className="tier-empty">Nothing here.</div>}
            {items.map((c) => (
              <CardRow key={c.id} card={c} d={d} onFocus={onFocus} />
            ))}
            {tier.key === "move" && open > 3 && (
              <div className="warn">More than 3 Moves — is the 4th really a Move, or a Must-do?</div>
            )}
            <AddCard onAdd={(text) => d.addCard(tier.key, text)} />
          </section>
        );
      })}
    </div>
  );
}

function CardRow({ card, d, onFocus }: { card: DeckCard; d: Deck; onFocus: (c: DeckCard) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(card.text);
  const others = TIERS.filter((t) => t.key !== card.tier);

  useEffect(() => {
    if (!editing) setText(card.text);
  }, [card.text, editing]);

  function commit() {
    setEditing(false);
    d.saveCardText(card, text);
  }

  return (
    <div className={`tcard ${card.tier}${card.done ? " done" : ""}`}>
      <button className="dot" onClick={() => d.toggleCard(card)} aria-label="toggle done" />
      {editing ? (
        <input
          className="tcard-edit"
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") { setText(card.text); setEditing(false); }
          }}
        />
      ) : (
        <span className="tcard-text" onClick={() => setEditing(true)} title="tap to edit">
          {card.text}
        </span>
      )}
      <button
        className={`chip${card.horizon === "today" ? " today" : ""}`}
        onClick={() => d.cycleHorizon(card)}
        title="change the day"
      >
        {HORIZON_LABEL[card.horizon]}
      </button>
      {!card.done && (
        <span className="tcard-tools">
          <button className="focus-btn" onClick={() => onFocus(card)} title="Focus in Right Now">◎</button>
          {others.map((o) => (
            <button key={o.key} className="move-pill" onClick={() => d.moveTier(card, o.key as Tier)}>
              → {o.label}
            </button>
          ))}
          <button className="del" onClick={() => d.removeCard(card)} title="Take off deck">✕</button>
        </span>
      )}
    </div>
  );
}

function AddCard({ onAdd }: { onAdd: (text: string) => void }) {
  const [adding, setAdding] = useState(false);
  const [val, setVal] = useState("");
  function submit() {
    if (val.trim()) onAdd(val.trim());
    setVal("");
    setAdding(false);
  }
  return adding ? (
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
    <button className="add" onClick={() => setAdding(true)}>+ add</button>
  );
}
