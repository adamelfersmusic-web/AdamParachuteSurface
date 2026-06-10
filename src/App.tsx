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
import { CalmColumnsView } from "./components/views/CalmColumnsView";
import { FocusView } from "./components/views/FocusView";
import { CardsView } from "./components/views/CardsView";
import { InboxDrawer } from "./components/InboxDrawer";
import { useDashboard } from "./useDashboard";
import type { BoardProps } from "./board";
import type { AuthSession, DragItem, TodoWhen } from "./types";

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

const DESIGNS = [
  { id: "calm", label: "Calm" },
  { id: "focus", label: "Focus" },
  { id: "cards", label: "Cards" },
] as const;
type DesignId = (typeof DESIGNS)[number]["id"];

function Dashboard({ auth, onDisconnect }: { auth: AuthManager; onDisconnect: () => void }) {
  const api = useMemo(() => new VaultApi(auth), [auth]);
  const d = useDashboard(api);

  const [design, setDesign] = useState<DesignId>(
    () => (localStorage.getItem("adam-deck.design") as DesignId) || "calm",
  );
  function chooseDesign(id: DesignId) {
    setDesign(id);
    localStorage.setItem("adam-deck.design", id);
  }

  // Shared drag state so a chip from the drawer can land in a column.
  const [drag, setDrag] = useState<DragItem | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  function dropInColumn(when: TodoWhen, index: number) {
    if (drag?.kind === "card") d.moveTodo(drag.id, when, index);
    else if (drag?.kind === "chip") d.addTodo(when, drag.text);
    setDrag(null);
  }

  const board: BoardProps = {
    d,
    drag,
    setDrag,
    dropInColumn,
    moveCard: d.moveTodo,
  };

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-name">Adam Deck</span>
          <span className="brand-slug">{vaultSlug(auth.vaultBase)}</span>
        </div>

        <nav className="design-switch" aria-label="Choose a design">
          {DESIGNS.map((dz) => (
            <button
              key={dz.id}
              className={`design-tab${design === dz.id ? " active" : ""}`}
              onClick={() => chooseDesign(dz.id)}
            >
              {dz.label}
            </button>
          ))}
        </nav>

        <div className="topbar-actions">
          <button
            className={`ghost pull-btn${drawerOpen ? " active" : ""}`}
            onClick={() => setDrawerOpen((o) => !o)}
            title="Pull from your lists"
          >
            ↧ List
          </button>
          <button className="ghost" onClick={d.reload} title="Refresh">↻</button>
          <button className="ghost" onClick={onDisconnect} title="Disconnect">⏻</button>
        </div>
      </header>

      {d.error && (
        <div className="error-box app-error">
          {d.error}
          <button className="ghost tiny" onClick={d.clearError}>dismiss</button>
        </div>
      )}

      <div className={`deck-wrap${drawerOpen ? " with-drawer" : ""}`}>
        <div className="deck-main">
          {d.loading && d.todos.length === 0 && !d.projectsContent ? (
            <div className="muted center pad">Loading your dashboard…</div>
          ) : design === "focus" ? (
            <FocusView {...board} />
          ) : design === "cards" ? (
            <CardsView {...board} />
          ) : (
            <CalmColumnsView {...board} />
          )}
        </div>

        <InboxDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          groups={d.inbox}
          onPull={d.addTodo}
          setDrag={setDrag}
        />
      </div>
    </div>
  );
}
