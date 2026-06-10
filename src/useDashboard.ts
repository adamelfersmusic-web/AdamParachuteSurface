import { useCallback, useEffect, useState } from "react";
import { ApiError, type VaultApi } from "./api";
import { boardTodos, byColumnOrder, isBoardTodo, todoPath, type Todo } from "./todos";
import { inboxGroups, type InboxGroup } from "./inbox";
import type { Note } from "./types";
import {
  ACTIVE_PROJECTS_PATH,
  ACTIVE_PROJECTS_SEED,
  DASHBOARD_TAG,
  TODO_TAG,
  WHEN_OFF_BOARD,
  type TodoWhen,
} from "./types";

// Everything the three dashboard views need: the editable Active Projects note,
// the board todos, the pull-from-list inbox, and the write operations. All
// writes go straight to the vault, then we reload to reflect server state.
export interface Dashboard {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  projectsContent: string;
  savingProjects: boolean;
  todos: Todo[];
  inbox: InboxGroup[];
  reload: () => Promise<void>;
  saveProjects: (text: string) => Promise<void>;
  addTodo: (when: TodoWhen, text: string) => Promise<void>;
  toggleDone: (todo: Todo) => Promise<void>;
  // ✕ — take the card off the board but keep the note in the vault.
  removeFromBoard: (todo: Todo) => Promise<void>;
  moveTodo: (id: string, toWhen: TodoWhen, toIndex: number) => Promise<void>;
}

export function useDashboard(api: VaultApi): Dashboard {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [savingProjects, setSavingProjects] = useState(false);
  const [projectsContent, setProjectsContent] = useState("");
  const [projectsId, setProjectsId] = useState<string | null>(null);
  const [projectsUpdatedAt, setProjectsUpdatedAt] = useState<string | undefined>();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [inbox, setInbox] = useState<InboxGroup[]>([]);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projects, todoNotes] = await Promise.all([
        loadOrCreateProjects(api),
        api.queryNotes({ tag: TODO_TAG, includeContent: true, limit: 300 }),
      ]);
      setProjectsContent(projects.content ?? "");
      setProjectsId(projects.id);
      setProjectsUpdatedAt(projects.updatedAt);
      const todoTagged = todoNotes.filter((n) => n.tags.includes(TODO_TAG));
      setTodos(boardTodos(todoTagged));
      // The drawer = every todo note that ISN'T on the board (master lists etc.).
      setInbox(inboxGroups(todoTagged.filter((n) => !isBoardTodo(n))));
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
    if (text === projectsContent || !projectsId) return;
    setSavingProjects(true);
    try {
      const updated = await api.updateNote(projectsId, {
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

  async function removeFromBoard(todo: Todo) {
    await guard(() =>
      api.updateNote(todo.id, {
        metadata: { when: WHEN_OFF_BOARD },
        ifUpdatedAt: todo.updatedAt,
      }),
    );
  }

  async function moveTodo(id: string, toWhen: TodoWhen, toIndex: number) {
    const moving = todos.find((t) => t.id === id);
    if (!moving) return;

    const dest = todos
      .filter((t) => t.when === toWhen && t.id !== id)
      .sort(byColumnOrder);
    const idx = Math.max(0, Math.min(toIndex, dest.length));
    dest.splice(idx, 0, moving);

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
    inbox,
    reload,
    saveProjects,
    addTodo,
    toggleDone,
    removeFromBoard,
    moveTodo,
  };
}

async function findProjectsNote(api: VaultApi): Promise<Note | null> {
  const matches = await api.queryNotes({
    tag: DASHBOARD_TAG,
    includeContent: true,
    limit: 50,
  });
  return (
    matches.find((n) => n.path === ACTIVE_PROJECTS_PATH) ??
    matches.find((n) => n.tags.includes(DASHBOARD_TAG)) ??
    null
  );
}

async function loadOrCreateProjects(api: VaultApi): Promise<Note> {
  const existing = await findProjectsNote(api);
  if (existing) return existing;
  try {
    return await api.createNote({
      path: ACTIVE_PROJECTS_PATH,
      content: ACTIVE_PROJECTS_SEED,
      tags: [DASHBOARD_TAG],
      metadata: {},
    });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 409 || e.conflict)) {
      const again = await findProjectsNote(api);
      if (again) return again;
    }
    throw e;
  }
}
