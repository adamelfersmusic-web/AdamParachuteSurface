import { useState } from "react";
import type { Dashboard } from "../../useDashboard";
import { TODO_COLUMNS } from "../../types";
import { ProjectsNote } from "../ProjectsNote";
import { TodoColumn } from "../todo/TodoColumn";

// Design 1 — "Calm": the projects note across the top, then Today / This Week /
// Later as three quiet columns side by side. Today is gently emphasized. Drag
// cards anywhere, including across columns.
export function CalmColumnsView({ d }: { d: Dashboard }) {
  const [dragging, setDragging] = useState<string | null>(null);
  return (
    <div className="view view-calm">
      <ProjectsNote content={d.projectsContent} saving={d.savingProjects} onSave={d.saveProjects} />
      <div className="calm-columns">
        {TODO_COLUMNS.map((w) => (
          <TodoColumn
            key={w}
            when={w}
            todos={d.todos}
            draggingId={dragging}
            setDraggingId={setDragging}
            onMove={d.moveTodo}
            onToggle={d.toggleDone}
            onDelete={d.deleteTodo}
            onAdd={d.addTodo}
            focal={w === "today"}
          />
        ))}
      </div>
    </div>
  );
}
