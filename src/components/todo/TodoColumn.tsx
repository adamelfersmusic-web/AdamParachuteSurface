import { useState } from "react";
import { byColumnOrder, type Todo } from "../../todos";
import { COLUMN_LABEL, TODO_COLUMNS, type TodoWhen } from "../../types";
import { TodoCardItem } from "./TodoCardItem";

// One column (Today / This Week / Later): its cards plus an add field. Owns the
// drop targets for drag-and-drop. `draggingId` is shared by the parent view so a
// card can be dragged from one column into another.
export function TodoColumn({
  when,
  todos,
  draggingId,
  setDraggingId,
  onMove,
  onToggle,
  onDelete,
  onAdd,
  showHeader = true,
  focal = false,
  hideDoneCount = false,
}: {
  when: TodoWhen;
  todos: Todo[];
  draggingId: string | null;
  setDraggingId: (id: string | null) => void;
  onMove: (id: string, when: TodoWhen, index: number) => void;
  onToggle: (todo: Todo) => void;
  onDelete: (todo: Todo) => void;
  onAdd: (when: TodoWhen, text: string) => void;
  showHeader?: boolean;
  focal?: boolean;
  hideDoneCount?: boolean;
}) {
  const items = todos.filter((t) => t.when === when).sort(byColumnOrder);
  const open = items.filter((t) => !t.done);
  const idx = TODO_COLUMNS.indexOf(when);
  const END = Number.MAX_SAFE_INTEGER;

  function dropAt(index: number) {
    if (draggingId) onMove(draggingId, when, index);
    setDraggingId(null);
  }

  return (
    <section
      className={`todo-column${focal ? " focal" : ""}${draggingId ? " drop-armed" : ""}`}
      data-when={when}
    >
      {showHeader && (
        <header className="column-head">
          <h3>{COLUMN_LABEL[when]}</h3>
          {!hideDoneCount && <span className="column-count">{open.length}</span>}
        </header>
      )}

      <ul
        className="column-list"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          dropAt(items.length);
        }}
      >
        {items.map((todo, i) => (
          <TodoCardItem
            key={todo.id}
            todo={todo}
            canPrev={idx > 0}
            canNext={idx < TODO_COLUMNS.length - 1}
            isDragging={draggingId === todo.id}
            onToggle={() => onToggle(todo)}
            onDelete={() => onDelete(todo)}
            onPrev={() => onMove(todo.id, TODO_COLUMNS[idx - 1], END)}
            onNext={() => onMove(todo.id, TODO_COLUMNS[idx + 1], END)}
            onDragStart={() => setDraggingId(todo.id)}
            onDragEnd={() => setDraggingId(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dropAt(i);
            }}
          />
        ))}
        {items.length === 0 && (
          <li className="column-empty">{draggingId ? "Drop here" : "Nothing here yet."}</li>
        )}
      </ul>

      <AddTodo onAdd={(text) => onAdd(when, text)} />
    </section>
  );
}

function AddTodo({ onAdd }: { onAdd: (text: string) => void }) {
  const [text, setText] = useState("");
  return (
    <form
      className="add-todo"
      onSubmit={(e) => {
        e.preventDefault();
        if (!text.trim()) return;
        onAdd(text);
        setText("");
      }}
    >
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="+ add"
      />
    </form>
  );
}
