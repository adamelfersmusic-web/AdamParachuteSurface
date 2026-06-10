import { useState } from "react";
import { byColumnOrder, type Todo } from "../../todos";
import { COLUMN_LABEL, TODO_COLUMNS, type DragItem, type TodoWhen } from "../../types";
import { TodoCardItem } from "./TodoCardItem";

// One column (Today / This Week / Later): its cards plus an add field. Owns the
// drop targets. The active `drag` is shared by the dashboard, so a card can be
// dragged here from another column AND a chip can be dragged here from the
// pull-from-list drawer (both resolve through onDrop).
export function TodoColumn({
  when,
  todos,
  drag,
  setDrag,
  onDrop,
  moveCard,
  onToggle,
  onRemove,
  onAdd,
  showHeader = true,
  focal = false,
}: {
  when: TodoWhen;
  todos: Todo[];
  drag: DragItem | null;
  setDrag: (d: DragItem | null) => void;
  onDrop: (when: TodoWhen, index: number) => void;
  moveCard: (id: string, when: TodoWhen, index: number) => void;
  onToggle: (todo: Todo) => void;
  onRemove: (todo: Todo) => void;
  onAdd: (when: TodoWhen, text: string) => void;
  showHeader?: boolean;
  focal?: boolean;
}) {
  const items = todos.filter((t) => t.when === when).sort(byColumnOrder);
  const open = items.filter((t) => !t.done);
  const idx = TODO_COLUMNS.indexOf(when);
  const END = Number.MAX_SAFE_INTEGER;

  function dropAt(index: number) {
    onDrop(when, index);
  }

  return (
    <section className={`todo-column${focal ? " focal" : ""}${drag ? " drop-armed" : ""}`}>
      {showHeader && (
        <header className="column-head">
          <h3>{COLUMN_LABEL[when]}</h3>
          <span className="column-count">{open.length}</span>
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
            isDragging={drag?.kind === "card" && drag.id === todo.id}
            onToggle={() => onToggle(todo)}
            onRemove={() => onRemove(todo)}
            onPrev={() => moveCard(todo.id, TODO_COLUMNS[idx - 1], END)}
            onNext={() => moveCard(todo.id, TODO_COLUMNS[idx + 1], END)}
            onDragStart={() => setDrag({ kind: "card", id: todo.id })}
            onDragEnd={() => setDrag(null)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dropAt(i);
            }}
          />
        ))}
        {items.length === 0 && (
          <li className="column-empty">{drag ? "Drop here" : "Nothing here yet."}</li>
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
