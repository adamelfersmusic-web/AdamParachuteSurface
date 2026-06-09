import type { Todo } from "../../todos";

// A single draggable todo card. Shared across all three designs; the visual
// differences come from the parent's CSS. Besides drag, it offers ‹ › buttons to
// hop columns (a fallback that also works on touch, where HTML5 drag is flaky)
// a checkbox, and an ✕ to delete.
export function TodoCardItem({
  todo,
  canPrev,
  canNext,
  isDragging,
  onToggle,
  onDelete,
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
  onDelete: () => void;
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
        <button className="card-del" onClick={onDelete} title="Delete" aria-label="Delete todo">
          ✕
        </button>
      </span>
    </li>
  );
}
