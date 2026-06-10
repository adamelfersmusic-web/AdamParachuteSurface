import { useState } from "react";
import type { InboxGroup } from "../inbox";
import { COLUMN_LABEL, TODO_COLUMNS, type DragItem, type TodoWhen } from "../types";

// The "pull from list" side drawer. Your master/other todo notes appear as
// collapsible groups of chips. Drag a chip onto a column, or tap Today/Week/Later
// to pull it in. The source note is never changed.
export function InboxDrawer({
  open,
  onClose,
  groups,
  onPull,
  setDrag,
}: {
  open: boolean;
  onClose: () => void;
  groups: InboxGroup[];
  onPull: (when: TodoWhen, text: string) => void;
  setDrag: (d: DragItem | null) => void;
}) {
  // First group open by default; the rest collapsed to keep it calm.
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  function isOpen(id: string, first: boolean) {
    return id in expanded ? expanded[id] : first;
  }

  if (!open) return null;

  return (
    <aside className="inbox-drawer">
      <header className="inbox-head">
        <span className="inbox-title">Pull from your lists</span>
        <button className="ghost tiny" onClick={onClose} aria-label="Close">✕</button>
      </header>

      <p className="inbox-hint">
        Drag a line onto a column, or tap a day to pull it in. Your lists stay
        untouched.
      </p>

      <div className="inbox-groups">
        {groups.length === 0 && (
          <div className="inbox-empty muted">No other to-do notes found.</div>
        )}
        {groups.map((g, gi) => {
          const showItems = isOpen(g.id, gi === 0);
          return (
            <section key={g.id} className="inbox-group">
              <button
                className="inbox-group-head"
                onClick={() => setExpanded((e) => ({ ...e, [g.id]: !showItems }))}
              >
                <span className="inbox-chevron">{showItems ? "▾" : "▸"}</span>
                <span className="inbox-group-title">{g.title}</span>
                <span className="inbox-group-count">{g.items.length}</span>
              </button>

              {showItems && (
                <ul className="chip-list">
                  {g.items.map((text, i) => (
                    <li
                      key={i}
                      className="chip"
                      draggable
                      onDragStart={() => setDrag({ kind: "chip", text })}
                      onDragEnd={() => setDrag(null)}
                    >
                      <span className="chip-text">{text}</span>
                      <span className="chip-actions">
                        {TODO_COLUMNS.map((w) => (
                          <button
                            key={w}
                            className="chip-pull"
                            onClick={() => onPull(w, text)}
                            title={`Pull into ${COLUMN_LABEL[w]}`}
                          >
                            {COLUMN_LABEL[w]}
                          </button>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })}
      </div>
    </aside>
  );
}
