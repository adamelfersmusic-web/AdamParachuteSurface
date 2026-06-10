import type { Horizon, Note } from "./types";
import { DECK_TAG } from "./types";

// A deck card, normalized from its own `deck/<horizon>` note.
export interface DeckCard {
  id: string;
  text: string;
  horizon: Horizon;
  done: boolean;
  order: number;
  createdAt: number;
}

// A note belongs to the deck iff it carries a deck tag. Horizon comes from the
// `deck/<horizon>` sub-tag.
export function isDeckCard(note: Note): boolean {
  return note.tags.some((t) => t === DECK_TAG || t.startsWith(`${DECK_TAG}/`));
}

function horizonOf(note: Note): Horizon {
  for (const t of note.tags) {
    if (t === `${DECK_TAG}/today`) return "today";
    if (t === `${DECK_TAG}/week`) return "week";
    if (t === `${DECK_TAG}/later`) return "later";
  }
  return "today";
}

function textOf(note: Note): string {
  const m = (note.content ?? "").match(/^#[ \t]+(.+?)[ \t]*$/m);
  if (m && m[1].trim()) return m[1].trim();
  return note.title;
}

function boolMeta(v: unknown): boolean {
  if (typeof v === "boolean") return v;
  if (typeof v === "string") return v.toLowerCase() === "true";
  return false;
}

function orderOf(note: Note): number {
  const o = note.metadata?.order;
  if (typeof o === "number") return o;
  return note.createdAt ? Date.parse(note.createdAt) : 0;
}

export function cardFromNote(note: Note): DeckCard {
  return {
    id: note.id,
    text: textOf(note),
    horizon: horizonOf(note),
    done: boolMeta(note.metadata?.done),
    order: orderOf(note),
    createdAt: note.createdAt ? Date.parse(note.createdAt) : 0,
  };
}

export function byOrder(a: DeckCard, b: DeckCard): number {
  return a.order - b.order || a.createdAt - b.createdAt;
}

// Filesystem-safe slug + random suffix for a new note's path.
function slug(text: string, fallback: string): string {
  const s = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);
  const rand = Math.random().toString(36).slice(2, 7);
  return `${s || fallback}-${rand}`;
}

export const deckPath = (text: string) => `deck/${slug(text, "card")}`;
export const capturePath = (text: string) => `capture/${slug(text, "note")}`;

// --- project rendering -------------------------------------------------------

// A project's display title + subtitle, derived from its status note. Title is
// the H1 trimmed before a dash; subtitle prefers the bit after the dash, else
// the note's summary.
export function projectTitle(note: Note): string {
  const m = (note.content ?? "").match(/^#[ \t]+(.+?)[ \t]*$/m);
  const h1 = m ? m[1].trim() : note.title;
  return h1.split(/\s+[—–-]\s+/)[0].trim();
}

export function projectSubtitle(note: Note): string {
  const m = (note.content ?? "").match(/^#[ \t]+(.+?)[ \t]*$/m);
  if (m) {
    const parts = m[1].split(/\s+[—–]\s+/);
    if (parts.length > 1) return parts.slice(1).join(" — ").trim();
  }
  const s = note.metadata?.summary;
  if (typeof s === "string") return s.split(/(?<=\.)\s/)[0].slice(0, 90);
  return "";
}

// A line of a project note, for the pull-a-line interaction.
export interface ProjectLine {
  raw: string;
  text: string; // cleaned, for pulling
  heading: boolean; // ## headings / "Where we're at" style — not pullable
  empty: boolean;
}

function cleanLine(text: string): string {
  return text
    .replace(/^[-*]\s+\[[ xX]\]\s+/, "")
    .replace(/^[-*]\s+/, "")
    .replace(/^\d+[.)]\s+/, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^[\s✅✔️☑️✓🔴🟡🟢⚠️•]+/, "")
    .replace(/\s+←.*$/, "")
    .trim();
}

export function projectLines(content: string): ProjectLine[] {
  return content.split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    const empty = line === "" || line === "---";
    const heading = /^#{1,6}\s/.test(line) || /^\*\*.+\*\*$/.test(line);
    return { raw: line, text: cleanLine(line), heading, empty };
  });
}
