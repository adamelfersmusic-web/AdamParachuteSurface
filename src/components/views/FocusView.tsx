import { useState } from "react";
import type { Dashboard } from "../../useDashboard";
import { ProjectsNote } from "../ProjectsNote";
import { TodoColumn } from "../todo/TodoColumn";

// Design 2 — "Focus": one centered column. Today is big and front-and-center;
// This Week and Later sit quietly underneath so they don't compete for your
// attention. Built to fight overwhelm — you mostly look at Today. Cards still
// drag between all three (they're all on screen) and the ‹ › buttons move them.
export function FocusView({ d }: { d: Dashboard }) {
  const [dragging, setDragging] = useState<string | null>(null);
  const shared = {
    todos: d.todos,
    draggingId: dragging,
    setDraggingId: setDragging,
    onMove: d.moveTodo,
    onToggle: d.toggleDone,
    onDelete: d.deleteTodo,
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
