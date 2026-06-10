import type { Todo } from "../../todos";

// A single draggable board card. The ✕ takes it off the board (keeps the note in
// your vault); the circle marks it done; ‹ › hop it between columns (a fallback
// that also works on touch, where HTML5 drag is flaky).
export function TodoCardItem({
  todo,
  canPrev,
  canNext,
  isDragging,
  onToggle,
  onRemove,
  onPrev,
  onNext,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  todo: Todo;
  canPrev: boolean;
  canNext: boolean;
  isDragging: boolean;
  onToggle: () => void;
  onRemove: () => void;
  onPrev: () => void;
  onNext: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
}) {
  return (
    <li
      className={`todo-card${todo.done ? " done" : ""}${isDragging ? " dragging" : ""}`}
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragOver={onDragOver}
      onDrop={onDrop}
    >
      <button
        className="card-check"
        onClick={onToggle}
        aria-label={todo.done ? "Mark not done" : "Mark done"}
        title={todo.done ? "Mark not done" : "Mark done"}
      >
        {todo.done ? "●" : "○"}
      </button>

      <span className="card-label">{todo.label}</span>

      <span className="card-tools">
        <button onClick={onPrev} disabled={!canPrev} title="Move left" aria-label="Move to previous column">
          ‹
        </button>
        <button onClick={onNext} disabled={!canNext} title="Move right" aria-label="Move to next column">
          ›
        </button>
        <button
          className="card-off"
          onClick={onRemove}
          title="Take off board (keeps it in your vault)"
          aria-label="Take off board"
        >
          ✕
        </button>
      </span>
    </li>
  );
}
