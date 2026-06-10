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
import { DeckView } from "./components/DeckView";
import { RightNow, type NowTask } from "./components/RightNow";
import { ProjectsView } from "./components/ProjectsView";
import { ProjectNote } from "./components/ProjectNote";
import { HorizonFocus } from "./components/HorizonFocus";
import { CaptureFab, type CaptureMode } from "./components/CaptureFab";
import { RunningListDrawer } from "./components/RunningListDrawer";
import { TimeStrip } from "./components/TimeStrip";
import { QuietLine } from "./components/QuietLine";
import { useDeck } from "./useDeck";
import type { DeckCard } from "./deck";
import type { AuthSession, Horizon, Note } from "./types";

type OAuthPhase =
  | { kind: "none" }
  | { kind: "completing" }
  | { kind: "approval"; approveUrl: string }
  | { kind: "error"; message: string };

export function App() {
  const [auth, setAuth] = useState<AuthManager | null>(null);
  const [phase, setPhase] = useState<OAuthPhase>({ kind: "none" });
  const ranReturn = useRef(false);

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
          <button className="btn-soft" onClick={() => setPhase({ kind: "none" })}>Back</button>
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
    <DeckApp
      auth={auth}
      onDisconnect={() => {
        clearSession();
        setAuth(null);
      }}
    />
  );
}

type ViewId = "deck" | "now" | "projects";

function DeckApp({ auth, onDisconnect }: { auth: AuthManager; onDisconnect: () => void }) {
  const api = useMemo(() => new VaultApi(auth), [auth]);
  const d = useDeck(api);

  const [view, setView] = useState<ViewId>("deck");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [nowTask, setNowTask] = useState<NowTask | null>(null);
  const [focusHorizon, setFocusHorizon] = useState<Horizon | null>(null);
  const [openProject, setOpenProject] = useState<Note | null>(null);

  function setNow(card: DeckCard) {
    setNowTask({ text: card.text, cardId: card.id });
    setFocusHorizon(null);
    setView("now");
  }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Adam Deck</h1>
          <span className="brand-slug">{vaultSlug(auth.vaultBase)}</span>
        </div>
        <div className="topbar-right">
          <nav className="nav">
            {(["deck", "now", "projects"] as const).map((v) => (
              <button
                key={v}
                className={`nav-btn${view === v ? " active" : ""}`}
                onClick={() => setView(v)}
              >
                {v === "deck" ? "Deck" : v === "now" ? "Right Now" : "Projects"}
              </button>
            ))}
          </nav>
          <button className="icon-btn" title="Running list" onClick={() => setDrawerOpen(true)}>≡</button>
          <button className="icon-btn" title="Refresh" onClick={d.reload}>↻</button>
          <button className="icon-btn" title="Disconnect" onClick={onDisconnect}>⏻</button>
        </div>
      </header>

      {d.error && (
        <div className="app-error">
          {d.error}
          <button className="link-btn" onClick={d.clearError}>dismiss</button>
        </div>
      )}

      <main className="main">
        {view === "deck" && (
          <>
            <TimeStrip events={d.events} />
            <QuietLine
              note={d.looseEnd}
              onHandle={d.handleLooseEnd}
              onDismiss={d.dismissLooseEnd}
            />
            <div className="deck-toolbar">
              <button className="pile-open" onClick={() => setDrawerOpen(true)}>
                ↧ Flick from the pile
              </button>
            </div>
            <DeckView d={d} setNow={setNow} openHorizon={setFocusHorizon} />
            <p className="held-foot">
              Everything you've captured is held in your vault — the deck is only what you chose.
            </p>
          </>
        )}
        {view === "now" && <RightNow d={d} nowTask={nowTask} setNowTask={setNowTask} />}
        {view === "projects" && <ProjectsView projects={d.projects} onOpen={setOpenProject} />}
      </main>

      <CaptureFab
        mode={captureMode}
        setMode={setCaptureMode}
        onDump={d.createCapture}
        onTodo={d.appendRunning}
      />

      {drawerOpen && (
        <RunningListDrawer
          content={d.runningContent}
          onWrite={d.writeRunning}
          onClose={() => setDrawerOpen(false)}
          onPull={(h, text) => d.addCard(h, text)}
        />
      )}

      {focusHorizon && (
        <HorizonFocus
          d={d}
          horizon={focusHorizon}
          setNow={setNow}
          onClose={() => setFocusHorizon(null)}
        />
      )}

      {openProject && (
        <ProjectNote
          note={openProject}
          onClose={() => setOpenProject(null)}
          onPullNow={(text) => { setNowTask({ text }); setOpenProject(null); setView("now"); }}
          onPullDeck={(text) => d.addCard("today", text)}
        />
      )}
    </div>
  );
}
