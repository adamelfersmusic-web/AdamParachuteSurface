import { useState } from "react";
import type { BoardProps } from "../../board";
import { COLUMN_LABEL, TODO_COLUMNS, type TodoWhen } from "../../types";
import { ProjectsNote } from "../ProjectsNote";
import { TodoColumn } from "../todo/TodoColumn";

// Design 3 — "Cards": one tab at a time. Pick Today / This Week / Later and flip
// to a single deck of larger index-card todos. Drag to reorder within the open
// tab; use ‹ › on a card to send it to another tab.
export function CardsView({ d, drag, setDrag, dropInColumn, moveCard }: BoardProps) {
  const [tab, setTab] = useState<TodoWhen>("today");

  function openCount(when: TodoWhen) {
    return d.todos.filter((t) => t.when === when && !t.done).length;
  }

  return (
    <div className="view view-cards">
      <ProjectsNote content={d.projectsContent} saving={d.savingProjects} onSave={d.saveProjects} />

      <div className="card-tabs" role="tablist">
        {TODO_COLUMNS.map((w) => (
          <button
            key={w}
            role="tab"
            aria-selected={tab === w}
            className={`card-tab${tab === w ? " active" : ""}`}
            onClick={() => setTab(w)}
          >
            {COLUMN_LABEL[w]}
            <span className="card-tab-count">{openCount(w)}</span>
          </button>
        ))}
      </div>

      <TodoColumn
        when={tab}
        todos={d.todos}
        drag={drag}
        setDrag={setDrag}
        onDrop={dropInColumn}
        moveCard={moveCard}
        onToggle={d.toggleDone}
        onRemove={d.removeFromBoard}
        onAdd={d.addTodo}
        showHeader={false}
      />
    </div>
  );
}
