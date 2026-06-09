import { useState } from "react";
import type { VaultApi } from "../api";
import type { Todo } from "../todos";
import { todoPath } from "../todos";
import { COLUMN_LABEL, TODO_COLUMNS, TODO_TAG, type TodoWhen } from "../types";

// Today / This Week / Later. Every action writes straight back to the vault as a
// note tagged `todo` with `when` + `done` metadata, then asks the dashboard to
// reload. `done` and `when` are sent on their own — the REST PATCH merges
// metadata server-side, so we never clobber the other fields.
export function TodoBoard({
  todos,
  api,
  onChanged,
  onError,
}: {
  todos: Todo[];
  api: VaultApi;
  onChanged: () => Promise<void> | void;
  onError: (message: string) => void;
}) {
  // ids currently being written — disables their controls so a double-tap can't
  // fire two conflicting PATCHes.
  const [pending, setPending] = useState<Set<string>>(new Set());

  function setBusy(id: string, busy: boolean) {
    setPending((prev) => {
      const next = new Set(prev);
      if (busy) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  async function run(id: string, op: () => Promise<unknown>) {
    setBusy(id, true);
    try {
      await op();
      await onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
      // Reload so the board reflects the true server state after a conflict.
      await onChanged();
    } finally {
      setBusy(id, false);
    }
  }

  async function addTodo(when: TodoWhen, text: string) {
    const body = text.trim();
    if (!body) return;
    await run(`add:${when}`, () =>
      api.createNote({
        path: todoPath(body),
        content: `# ${body}\n`,
        tags: [TODO_TAG],
        metadata: { when, done: false },
      }),
    );
  }

  function toggleDone(todo: Todo) {
    run(todo.id, () =>
      api.updateNote(todo.id, {
        metadata: { done: !todo.done },
        ifUpdatedAt: todo.updatedAt,
      }),
    );
  }

  function move(todo: Todo, when: TodoWhen) {
    run(todo.id, () =>
      api.updateNote(todo.id, { metadata: { when }, ifUpdatedAt: todo.updatedAt }),
    );
  }

  return (
    <div className="todo-board">
      {TODO_COLUMNS.map((when) => {
        const colTodos = todos.filter((t) => t.when === when);
        // Open items first (newest open at top), done items dimmed at the bottom.
        const open = colTodos.filter((t) => !t.done);
        const done = colTodos.filter((t) => t.done);
        const ordered = [...open, ...done];
        const idx = TODO_COLUMNS.indexOf(when);

        return (
          <section
            key={when}
            className={`todo-col${when === "today" ? " focal" : ""}`}
          >
            <header className="col-head">
              <h3>{COLUMN_LABEL[when]}</h3>
              <span className="col-count">{open.length}</span>
            </header>

            <ul className="todo-list">
              {ordered.map((todo) => {
                const busy = pending.has(todo.id);
                return (
                  <li key={todo.id} className={`todo${todo.done ? " done" : ""}`}>
                    <button
                      className="todo-check"
                      onClick={() => toggleDone(todo)}
                      disabled={busy}
                      title={todo.done ? "Mark not done" : "Mark done"}
                      aria-label={todo.done ? "Mark not done" : "Mark done"}
                    >
                      {todo.done ? "●" : "○"}
                    </button>
                    <span className="todo-label">{todo.label}</span>
                    <span className="todo-move">
                      <button
                        onClick={() => move(todo, TODO_COLUMNS[idx - 1])}
                        disabled={busy || idx === 0}
                        title="Move left"
                        aria-label="Move to previous column"
                      >
                        ‹
                      </button>
                      <button
                        onClick={() => move(todo, TODO_COLUMNS[idx + 1])}
                        disabled={busy || idx === TODO_COLUMNS.length - 1}
                        title="Move right"
                        aria-label="Move to next column"
                      >
                        ›
                      </button>
                    </span>
                  </li>
                );
              })}
              {ordered.length === 0 && <li className="todo-empty muted">Nothing here.</li>}
            </ul>

            <AddTodo
              disabled={pending.has(`add:${when}`)}
              onAdd={(text) => addTodo(when, text)}
            />
          </section>
        );
      })}
    </div>
  );
}

function AddTodo({
  onAdd,
  disabled,
}: {
  onAdd: (text: string) => void;
  disabled: boolean;
}) {
  const [text, setText] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    onAdd(text);
    setText("");
  }

  return (
    <form className="add-todo" onSubmit={submit}>
      <input
        type="text"
        placeholder="Add a todo…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />
    </form>
  );
}
