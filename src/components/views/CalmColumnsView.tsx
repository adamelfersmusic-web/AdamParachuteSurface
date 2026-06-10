import type { BoardProps } from "../../board";
import { TODO_COLUMNS } from "../../types";
import { ProjectsNote } from "../ProjectsNote";
import { TodoColumn } from "../todo/TodoColumn";

// Design 1 — "Calm": the projects note across the top, then Today / This Week /
// Later as three quiet columns side by side. Today is gently emphasized.
export function CalmColumnsView({ d, drag, setDrag, dropInColumn, moveCard }: BoardProps) {
  return (
    <div className="view view-calm">
      <ProjectsNote content={d.projectsContent} saving={d.savingProjects} onSave={d.saveProjects} />
      <div className="calm-columns">
        {TODO_COLUMNS.map((w) => (
          <TodoColumn
            key={w}
            when={w}
            todos={d.todos}
            drag={drag}
            setDrag={setDrag}
            onDrop={dropInColumn}
            moveCard={moveCard}
            onToggle={d.toggleDone}
            onRemove={d.removeFromBoard}
            onAdd={d.addTodo}
            focal={w === "today"}
          />
        ))}
      </div>
    </div>
  );
}
