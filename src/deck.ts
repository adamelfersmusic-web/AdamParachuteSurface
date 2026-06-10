import type { Horizon, Note } from "./types";
import { DECK_TAG } from "./types";

// Collapse real OR literal-escaped newlines/tabs to spaces for single-line
// display (fixes captured notes showing raw "\n").
export function inlineText(s: string): string {
  return s
    .replace(/\\[nt]/g, " ")
    .replace(/[\r\n\t]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// A deck card, normalized from its own deck note.
export interface DeckCard {
  id: string;
  text: string;
  horizon: Horizon;
  done: boolean;
  order: number;
  createdAt: number;
  notes: string; // scratch space for working the task, stored below the H1
}

// A note belongs to the deck iff it carries a deck tag (flat `deck` or a
// `deck/<horizon>` sub-tag from the older shape).
export function isDeckCard(note: Note): boolean {
  return note.tags.some((t) => t === DECK_TAG || t.startsWith(`${DECK_TAG}/`));
}

// Horizon now lives in metadata (reliable to update); we fall back to an older
// `deck/<horizon>` sub-tag so existing cards keep working.
function horizonOf(note: Note): Horizon {
  const h = note.metadata?.horizon;
  if (h === "today" || h === "week" || h === "later") return h;
  for (const t of note.tags) {
    if (t === `${DECK_TAG}/today`) return "today";
    if (t === `${DECK_TAG}/week`) return "week";
    if (t === `${DECK_TAG}/later`) return "later";
  }
  return "today";
}

function textOf(note: Note): string {
  const m = (note.content ?? "").match(/^#[ \t]+(.+?)[ \t]*$/m);
  if (m && m[1].trim()) return inlineText(m[1]);
  return inlineText(note.title);
}

// Everything in the card note below its H1 title line — the per-task scratch.
export function cardNotesBody(content: string): string {
  const lines = content.split(/\r?\n/);
  const i = lines.findIndex((l) => /^#[ \t]+/.test(l));
  if (i === -1) return content.trim();
  return lines.slice(i + 1).join("\n").trim();
}

// Rebuild a card note's content from its title + scratch body.
export function cardContent(title: string, notes: string): string {
  const body = notes.trim();
  return body ? `# ${title}\n\n${body}\n` : `# ${title}\n`;
}

// Parse a pile / running-list note into clean, flickable task lines — skipping
// section headers, separators, and italic notes so the flick list stays calm.
export function pileLines(content: string): string[] {
  return content
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l && !/^#{1,6}\s/.test(l) && l !== "---" && !/^\*.*\*$/.test(l))
    .map((l) => inlineText(l.replace(/^[-*]\s+\[[ xX]\]\s+/, "").replace(/^[-*]\s+/, "")))
    .filter(Boolean);
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
    notes: cardNotesBody(note.content ?? ""),
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
