import type { Note, TodoWhen } from "./types";
import { TODO_COLUMNS, TODOS_PATH_PREFIX } from "./types";

// A board todo, normalized from its note.
export interface Todo {
  note: Note;
  id: string;
  label: string;
  when: TodoWhen;
  done: boolean;
  updatedAt?: string;
}

// The crux of the "don't flood the board" rule. The vault's big "MASTER TO-DO
// LIST" notes are also tagged `todo`; a board todo is one that either carries a
// `when` metadata field OR lives under todos/. Everything else is ignored.
export function isBoardTodo(note: Note): boolean {
  if (note.path.toLowerCase().startsWith(TODOS_PATH_PREFIX)) return true;
  const when = note.metadata?.when;
  return typeof when === "string" && when.trim() !== "";
}

// Coerce a free-form `when` value to a column. Board todos created here always
// carry a valid `when`; the only ones missing it are the pre-existing todos/
// notes (e.g. "Colombia Trip"), which we park in This Week — visible but not
// crowding the focal Today column. The user can move them from there.
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
    updatedAt: note.updatedAt,
  };
}

// Filter to board todos and normalize, newest first within a column later.
export function boardTodos(notes: Note[]): Todo[] {
  return notes.filter(isBoardTodo).map(toTodo);
}

// A filesystem-safe slug for a new todo's path: todos/<slug>-<rand>. The random
// suffix keeps two todos with the same text from colliding on one path.
export function todoPath(text: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || "todo";
  const rand = Math.random().toString(36).slice(2, 7);
  return `${TODOS_PATH_PREFIX}${slug}-${rand}`;
}
