import type { Dashboard } from "./useDashboard";
import type { DragItem, TodoWhen } from "./types";

// The shared bundle each design view needs to render the board and wire up drag.
// Drag state lives at the dashboard level so a chip dragged out of the pull-list
// drawer can be dropped into a column.
export interface BoardProps {
  d: Dashboard;
  drag: DragItem | null;
  setDrag: (d: DragItem | null) => void;
  // Called when something is dropped into a column. Resolves the active drag:
  // an existing card moves, a drawer chip becomes a new card.
  dropInColumn: (when: TodoWhen, index: number) => void;
  // The ‹ › arrows move an existing card between columns (no drag involved).
  moveCard: (id: string, when: TodoWhen, index: number) => void;
}
