import { useCallback, useEffect, useState } from "react";
import { ApiError, type VaultApi } from "./api";
import { boardTodos, byColumnOrder, todoPath, type Todo } from "./todos";
import {
  ACTIVE_PROJECTS_PATH,
  ACTIVE_PROJECTS_SEED,
  DASHBOARD_TAG,
  TODO_TAG,
  type TodoWhen,
} from "./types";

// Everything the three dashboard views need: the editable Active Projects note,
// the todos, and the handful of write operations. All writes go straight to the
// vault, then we reload so the UI reflects the true server state.
export interface Dashboard {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  projectsContent: string;
  savingProjects: boolean;
  todos: Todo[];
  reload: () => Promise<void>;
  saveProjects: (text: string) => Promise<void>;
  addTodo: (when: TodoWhen, text: string) => Promise<void>;
  toggleDone: (todo: Todo) => Promise<void>;
  deleteTodo: (todo: Todo) => Promise<void>;
  // Move `id` into column `toWhen` at position `toIndex` (clamped), renumbering
  // that column to a clean 0..n so the drag order sticks.
  moveTodo: (id: string, toWhen: TodoWhen, toIndex: number) => Promise<void>;
}

export function useDashboard(api: VaultApi): Dashboard {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProjects, setSavingProjects] = useState(false);
  const [projectsContent, setProjectsContent] = useState("");
  const [projectsUpdatedAt, setProjectsUpdatedAt] = useState<string | undefined>();
  const [todos, setTodos] = useState<Todo[]>([]);

  // Fetch the Active Projects note (creating it the first time) and the todos.
  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projects, todoNotes] = await Promise.all([
        loadOrCreateProjects(api),
        api.queryNotes({ tag: TODO_TAG, includeContent: true, limit: 300 }),
      ]);
      setProjectsContent(projects.content ?? "");
      setProjectsUpdatedAt(projects.updatedAt);
      setTodos(boardTodos(todoNotes.filter((n) => n.tags.includes(TODO_TAG))));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    reload();
  }, [reload]);

  async function guard(op: () => Promise<unknown>) {
    try {
      await op();
      await reload();
    } catch (e) {
      const msg =
        e instanceof ApiError && e.conflict
          ? "That changed in your vault a moment ago — reloaded to the latest."
          : e instanceof Error
            ? e.message
            : String(e);
      setError(msg);
      await reload();
    }
  }

  async function saveProjects(text: string) {
    if (text === projectsContent) return;
    setSavingProjects(true);
    try {
      const updated = await api.updateNote(ACTIVE_PROJECTS_PATH, {
        content: text,
        ifUpdatedAt: projectsUpdatedAt,
      });
      setProjectsContent(updated.content ?? text);
      setProjectsUpdatedAt(updated.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await reload();
    } finally {
      setSavingProjects(false);
    }
  }

  async function addTodo(when: TodoWhen, text: string) {
    const body = text.trim();
    if (!body) return;
    await guard(() =>
      api.createNote({
        path: todoPath(body),
        content: `# ${body}\n`,
        tags: [TODO_TAG],
        // Date.now() sorts it to the bottom of the column until it's dragged.
        metadata: { when, done: false, order: Date.now() },
      }),
    );
  }

  async function toggleDone(todo: Todo) {
    await guard(() =>
      api.updateNote(todo.id, {
        metadata: { done: !todo.done },
        ifUpdatedAt: todo.updatedAt,
      }),
    );
  }

  async function deleteTodo(todo: Todo) {
    await guard(() => api.deleteNote(todo.id));
  }

  async function moveTodo(id: string, toWhen: TodoWhen, toIndex: number) {
    const moving = todos.find((t) => t.id === id);
    if (!moving) return;

    const dest = todos
      .filter((t) => t.when === toWhen && t.id !== id)
      .sort(byColumnOrder);
    const idx = Math.max(0, Math.min(toIndex, dest.length));
    dest.splice(idx, 0, moving);

    // Renumber the destination column to 0..n; write only what actually changed.
    const writes: Promise<unknown>[] = [];
    dest.forEach((t, j) => {
      const changedOrder = t.order !== j;
      const changedWhen = t.id === id && moving.when !== toWhen;
      if (changedOrder || changedWhen) {
        const metadata: Record<string, unknown> = { order: j };
        if (t.id === id) metadata.when = toWhen;
        writes.push(api.updateNote(t.id, { metadata, ifUpdatedAt: t.updatedAt }));
      }
    });
    if (writes.length === 0) return;
    await guard(() => Promise.all(writes));
  }

  return {
    loading,
    error,
    clearError: () => setError(null),
    projectsContent,
    savingProjects,
    todos,
    reload,
    saveProjects,
    addTodo,
    toggleDone,
    deleteTodo,
    moveTodo,
  };
}

async function loadOrCreateProjects(api: VaultApi) {
  try {
    return await api.getNote(ACTIVE_PROJECTS_PATH);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return api.createNote({
        path: ACTIVE_PROJECTS_PATH,
        content: ACTIVE_PROJECTS_SEED,
        tags: [DASHBOARD_TAG],
        metadata: {},
      });
    }
    throw e;
  }
}
