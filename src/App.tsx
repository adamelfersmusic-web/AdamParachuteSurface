import { useEffect, useMemo, useRef, useState } from "react";
import { VaultApi } from "./api";
import { AuthManager } from "./auth";
import { clearSession, loadSession, saveSession, vaultSlug } from "./config";
import {
  completeOAuth,
  PendingApprovalError,
  loadPending,
  resolveVaultUrl,
  storedFromTokenResponse,
} from "./oauth";
import { ConfigScreen } from "./components/ConfigScreen";
import { ProjectCard } from "./components/ProjectCard";
import { TodoBoard } from "./components/TodoBoard";
import { parseStatus, type ParsedStatus } from "./status";
import { boardTodos, type Todo } from "./todos";
import { STATUS_TAG, TODO_TAG, type AuthSession } from "./types";

type OAuthPhase =
  | { kind: "none" }
  | { kind: "completing" }
  | { kind: "approval"; approveUrl: string }
  | { kind: "error"; message: string };

export function App() {
  const [auth, setAuth] = useState<AuthManager | null>(null);
  const [phase, setPhase] = useState<OAuthPhase>({ kind: "none" });
  const ranReturn = useRef(false);

  // Build (or rebuild) the auth manager from a session and remember it.
  function adopt(session: AuthSession) {
    saveSession(session);
    setAuth(
      new AuthManager(session, (next) => {
        if (!next) {
          clearSession();
          setAuth(null);
        }
      }),
    );
  }

  // On first load, either restore a saved session or finish an OAuth return.
  useEffect(() => {
    if (ranReturn.current) return;
    ranReturn.current = true;

    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");
    const oauthError = params.get("error");
    const returning = (code && state) || oauthError;

    if (!returning) {
      const saved = loadSession();
      if (saved) adopt(saved);
      return;
    }

    // Clean the OAuth params out of the URL so a refresh doesn't re-run it.
    const cleanUrl = window.location.origin + window.location.pathname;
    window.history.replaceState(null, "", cleanUrl);

    if (oauthError) {
      setPhase({ kind: "error", message: `Hub returned: ${oauthError}` });
      return;
    }
    if (!loadPending()) {
      // No pending flow (e.g. a stale/bookmarked callback) — fall back to restore.
      const saved = loadSession();
      if (saved) adopt(saved);
      return;
    }

    setPhase({ kind: "completing" });
    completeOAuth(code!, state!)
      .then(({ pending, token }) => {
        const vaultUrl = resolveVaultUrl(token, pending.issuerUrl);
        adopt({
          vaultUrl,
          issuer: pending.issuer,
          tokenEndpoint: pending.tokenEndpoint,
          clientId: pending.clientId,
          token: storedFromTokenResponse(token),
        });
        setPhase({ kind: "none" });
      })
      .catch((err) => {
        if (err instanceof PendingApprovalError) {
          setPhase({ kind: "approval", approveUrl: err.approveUrl });
        } else {
          setPhase({ kind: "error", message: err instanceof Error ? err.message : String(err) });
        }
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase.kind === "completing") {
    return (
      <div className="config-screen">
        <div className="config-card center">
          <h1>Connecting…</h1>
          <p className="muted">Exchanging the authorization code with your vault.</p>
        </div>
      </div>
    );
  }

  if (phase.kind === "approval") {
    return (
      <div className="config-screen">
        <div className="config-card center">
          <h1>Waiting for hub approval</h1>
          <p className="muted">
            Your hub admin needs to approve Adam Deck before sign-in can complete.
            Open the approval page, approve, then connect again.
          </p>
          <a className="approve-link" href={phase.approveUrl} target="_blank" rel="noreferrer">
            Open approval page
          </a>
          <button className="ghost" onClick={() => setPhase({ kind: "none" })}>
            Back
          </button>
        </div>
      </div>
    );
  }

  if (!auth) {
    // Surface any OAuth-return error above the form rather than on a dead end.
    return (
      <ConfigScreen
        onConnected={adopt}
        notice={phase.kind === "error" ? phase.message : undefined}
      />
    );
  }

  return (
    <Dashboard
      auth={auth}
      onDisconnect={() => {
        clearSession();
        setAuth(null);
      }}
    />
  );
}

function Dashboard({ auth, onDisconnect }: { auth: AuthManager; onDisconnect: () => void }) {
  const api = useMemo(() => new VaultApi(auth), [auth]);

  const [statuses, setStatuses] = useState<ParsedStatus[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      // Feature 1: the two status notes, with bodies, for the project cards.
      // Feature 2: the todo notes, with bodies, for the board (filtered to board
      // todos so the MASTER lists don't flood it).
      const [statusNotes, todoNotes] = await Promise.all([
        api.queryNotes({ tag: STATUS_TAG, includeContent: true }),
        api.queryNotes({ tag: TODO_TAG, includeContent: true, limit: 300 }),
      ]);
      const parsed = statusNotes
        .filter((n) => n.tags.includes(STATUS_TAG))
        .map(parseStatus)
        .sort((a, b) => a.projectName.localeCompare(b.projectName));
      setStatuses(parsed);
      setTodos(boardTodos(todoNotes.filter((n) => n.tags.includes(TODO_TAG))));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [api]);

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">Adam Deck</span>
          <span className="brand-slug">{vaultSlug(auth.vaultBase)}</span>
        </div>
        <div className="topbar-actions">
          <button className="ghost" onClick={load} title="Refresh">↻ Refresh</button>
          <button className="ghost" onClick={onDisconnect} title="Disconnect">⏻</button>
        </div>
      </header>

      {error && (
        <div className="error-box app-error">
          {error}
          <button className="ghost tiny" onClick={() => setError(null)}>dismiss</button>
        </div>
      )}

      <main className="deck">
        <section className="projects">
          {loading && statuses.length === 0 ? (
            <div className="muted center pad">Loading your projects…</div>
          ) : statuses.length === 0 ? (
            <div className="muted center pad">No status notes found (tag: status).</div>
          ) : (
            <div className="project-grid">
              {statuses.map((s) => (
                <ProjectCard
                  key={s.note.id}
                  status={s}
                  expanded={expandedId === s.note.id}
                  onToggle={() =>
                    setExpandedId((cur) => (cur === s.note.id ? null : s.note.id))
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section className="board-section">
          <h2 className="board-title">To-do</h2>
          <TodoBoard
            todos={todos}
            api={api}
            onChanged={load}
            onError={(m) => setError(m)}
          />
        </section>
      </main>
    </div>
  );
}
