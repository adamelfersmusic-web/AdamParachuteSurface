import type { BoardProps } from "../../board";
import { ProjectsNote } from "../ProjectsNote";
import { TodoColumn } from "../todo/TodoColumn";

// Design 2 — "Focus": one centered column. Today is big and front-and-center;
// This Week and Later sit quietly underneath so they don't compete for your
// attention. Cards still drag between all three (they're all on screen).
export function FocusView({ d, drag, setDrag, dropInColumn, moveCard }: BoardProps) {
  const shared = {
    todos: d.todos,
    drag,
    setDrag,
    onDrop: dropInColumn,
    moveCard,
    onToggle: d.toggleDone,
    onRemove: d.removeFromBoard,
    onAdd: d.addTodo,
  };
  return (
    <div className="view view-focus">
      <ProjectsNote
        content={d.projectsContent}
        saving={d.savingProjects}
        onSave={d.saveProjects}
        className="compact"
      />
      <div className="focus-today">
        <TodoColumn when="today" focal {...shared} />
      </div>
      <div className="focus-secondary">
        <TodoColumn when="this-week" {...shared} />
        <TodoColumn when="later" {...shared} />
      </div>
    </div>
  );
}
