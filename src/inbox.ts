import type { Note } from "./types";

// The "pull from list" drawer reads your non-board todo notes (master lists,
// running lists, anything tagged `todo` without a column) and turns each into a
// group of pullable chips — one per open task line. Pulling a chip onto the
// board creates a new card and leaves the source note untouched.
export interface InboxGroup {
  id: string;
  title: string;
  items: string[];
}

function clean(text: string): string {
  return text
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`(.+?)`/g, "$1")
    .replace(/^[\s✅✔️☑️✓🔴🟡🟢⚠️•▪◦>]+/, "")
    .replace(/\s+←.*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function titleOf(note: Note): string {
  const m = (note.content ?? "").match(/^#[ \t]+(.+?)[ \t]*$/m);
  if (m) {
    const h1 = clean(m[1]);
    if (h1) return h1;
  }
  return note.title;
}

// Extract task-like lines: unchecked checkboxes, bullets, numbered items. Done
// checkboxes are skipped. Deduped and capped so a 40-item master note stays
// manageable in the drawer.
export function parseInboxItems(content: string): string[] {
  const out: string[] = [];
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^[-*]\s+\[[xX]\]\s+/.test(line)) continue; // already done
    let m = line.match(/^[-*]\s+\[ \]\s+(.+)$/); // unchecked checkbox
    if (!m) m = line.match(/^[-*]\s+(.+)$/); // bullet
    if (!m) m = line.match(/^\d+[.)]\s+(.+)$/); // numbered
    if (m) {
      const text = clean(m[1]);
      if (text && text.length > 1) out.push(text);
    }
  }
  return [...new Set(out)].slice(0, 60);
}

export function inboxGroups(notes: Note[]): InboxGroup[] {
  return notes
    .map((n) => ({ id: n.id, title: titleOf(n), items: parseInboxItems(n.content ?? "") }))
    .filter((g) => g.items.length > 0)
    .sort((a, b) => b.items.length - a.items.length);
}
