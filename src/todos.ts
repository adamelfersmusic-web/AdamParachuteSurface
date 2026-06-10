import type { Note, TodoWhen } from "./types";
import { TODO_COLUMNS, TODOS_PATH_PREFIX } from "./types";

// A board todo, normalized from its note.
export interface Todo {
  note: Note;
  id: string;
  label: string;
  when: TodoWhen;
  done: boolean;
  order: number;
  createdAt: number;
  updatedAt?: string;
}

// Board membership is now explicit: a card is on the board iff its `when` is one
// of the three columns. This keeps the big "MASTER TO-DO LIST" notes (no `when`)
// off the board — they live in the pull-from-list drawer instead — and lets the
// ✕ button take a card off the board (clear its `when`) without deleting it.
export function isBoardTodo(note: Note): boolean {
  const when = note.metadata?.when;
  return (
    typeof when === "string" &&
    (TODO_COLUMNS as readonly string[]).includes(when.trim().toLowerCase())
  );
}

// Coerce a free-form `when` value to a column. New todos always carry a valid
// `when`; pre-existing todos/ notes without one are parked in This Week.
export function whenOf(note: Note): TodoWhen {
  const raw = note.metadata?.when;
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase();
    if ((TODO_COLUMNS as readonly string[]).includes(v)) return v as TodoWhen;
  }
  return "this-week";
}

function doneOf(note: Note): boolean {
  const d = note.metadata?.done;
  if (typeof d === "boolean") return d;
  if (typeof d === "string") return d.toLowerCase() === "true";
  return false;
}

// Sort key within a column. An explicit `order` number wins; otherwise we fall
// back to creation time (ms), so untouched columns read in creation order and a
// dragged column reads in the small 0..n order we renumber it to. New adds use
// Date.now() so they land at the bottom until the user drags them.
export function orderOf(note: Note): number {
  const o = note.metadata?.order;
  if (typeof o === "number") return o;
  const t = note.createdAt ? Date.parse(note.createdAt) : 0;
  return Number.isFinite(t) ? t : 0;
}

// A readable label: prefer the note's H1 (minus a "TODO:" prefix), else the
// humanized path basename that api.ts already computed as the title.
function labelOf(note: Note): string {
  const content = note.content ?? "";
  const m = content.match(/^#[ \t]+(.+?)[ \t]*$/m);
  if (m) {
    const h1 = m[1].replace(/^todo:?\s*/i, "").trim();
    if (h1) return h1;
  }
  return note.title;
}

export function toTodo(note: Note): Todo {
  return {
    note,
    id: note.id,
    label: labelOf(note),
    when: whenOf(note),
    done: doneOf(note),
    order: orderOf(note),
    createdAt: note.createdAt ? Date.parse(note.createdAt) : 0,
    updatedAt: note.updatedAt,
  };
}

// Stable in-column ordering: by order, then creation time as a tiebreak.
export function byColumnOrder(a: Todo, b: Todo): number {
  return a.order - b.order || a.createdAt - b.createdAt;
}

// Filter to board todos and normalize.
export function boardTodos(notes: Note[]): Todo[] {
  return notes.filter(isBoardTodo).map(toTodo);
}

// A filesystem-safe slug for a new todo's path: todos/<slug>-<rand>. The random
// suffix keeps two todos with the same text from colliding on one path.
export function todoPath(text: string): string {
  const slug =
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "todo";
  const rand = Math.random().toString(36).slice(2, 7);
  return `${TODOS_PATH_PREFIX}${slug}-${rand}`;
}
