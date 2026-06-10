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
import { ProjectWall } from "./components/ProjectWall";
import { ProjectNote } from "./components/ProjectNote";
import { CalendarView } from "./components/CalendarView";
import { CaptureFab, type CaptureMode } from "./components/CaptureFab";
import { RunningListDrawer } from "./components/RunningListDrawer";
import { TimeStrip } from "./components/TimeStrip";
import { QuietLine } from "./components/QuietLine";
import { WorkspaceView } from "./components/WorkspaceView";
import { ScratchpadView } from "./components/ScratchpadView";
import { useDeck } from "./useDeck";
import type { DeckCard } from "./deck";
import type { AuthSession, Note } from "./types";

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
        adopt({
          vaultUrl: resolveVaultUrl(token, pending.issuerUrl),
          issuer: pending.issuer,
          tokenEndpoint: pending.tokenEndpoint,
          clientId: pending.clientId,
          token: storedFromTokenResponse(token),
        });
        setPhase({ kind: "none" });
      })
      .catch((err) => {
        if (err instanceof PendingApprovalError) setPhase({ kind: "approval", approveUrl: err.approveUrl });
        else setPhase({ kind: "error", message: err instanceof Error ? err.message : String(err) });
      });
  }, []);

  if (phase.kind === "completing") {
    return (
      <div className="config-screen">
        <div className="config-card center"><h1>Connecting…</h1><p className="muted">Exchanging the authorization code with your vault.</p></div>
      </div>
    );
  }
  if (phase.kind === "approval") {
    return (
      <div className="config-screen">
        <div className="config-card center">
          <h1>Waiting for hub approval</h1>
          <p className="muted">Your hub admin needs to approve Adam Deck before sign-in can complete. Approve, then connect again.</p>
          <a className="approve-link" href={phase.approveUrl} target="_blank" rel="noreferrer">Open approval page</a>
          <button className="btn-soft" onClick={() => setPhase({ kind: "none" })}>Back</button>
        </div>
      </div>
    );
  }
  if (!auth) {
    return <ConfigScreen onConnected={adopt} notice={phase.kind === "error" ? phase.message : undefined} />;
  }
  return <DeckApp auth={auth} onDisconnect={() => { clearSession(); setAuth(null); }} />;
}

type ViewId = "deck" | "now" | "projects" | "calendar" | "workspace" | "scratch";
const NAV: { id: ViewId; label: string }[] = [
  { id: "deck", label: "Deck" },
  { id: "now", label: "Right Now" },
  { id: "projects", label: "Projects" },
  { id: "calendar", label: "Calendar" },
  { id: "workspace", label: "Workspace" },
  { id: "scratch", label: "Scratch" },
];

function DeckApp({ auth, onDisconnect }: { auth: AuthManager; onDisconnect: () => void }) {
  const api = useMemo(() => new VaultApi(auth), [auth]);
  const d = useDeck(api);

  const [view, setView] = useState<ViewId>("deck");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [captureMode, setCaptureMode] = useState<CaptureMode>(null);
  const [nowTask, setNowTask] = useState<NowTask | null>(null);
  const [openProject, setOpenProject] = useState<Note | null>(null);
  const [deepOpen, setDeepOpen] = useState(false);

  useEffect(() => {
    if (!openProject) setDeepOpen(false);
  }, [openProject]);

  function focus(card: DeckCard) {
    setNowTask({ text: card.text, cardId: card.id });
    setView("now");
  }
  function flickNow(text: string) {
    setNowTask({ text });
    setOpenProject(null);
    setView("now");
  }

  const deep = openProject ? d.findDeep(openProject) : null;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <h1>Adam Deck</h1>
          <span className="brand-slug">{vaultSlug(auth.vaultBase)}</span>
        </div>
        <div className="topbar-right">
          <nav className="nav">
            {NAV.map((n) => (
              <button key={n.id} className={`nav-btn${view === n.id ? " active" : ""}`} onClick={() => setView(n.id)}>
                {n.label}
              </button>
            ))}
          </nav>
          <button className="icon-btn" title="The pile" onClick={() => setDrawerOpen(true)}>≡</button>
          <button className="icon-btn" title="Refresh" onClick={d.reload}>↻</button>
          <button className="icon-btn" title="Disconnect" onClick={onDisconnect}>⏻</button>
        </div>
      </header>

      {d.error && (
        <div className="app-error">{d.error}<button className="link-btn" onClick={d.clearError}>dismiss</button></div>
      )}

      <main className="main">
        {view === "deck" && (
          <>
            <TimeStrip events={d.events} />
            <QuietLine note={d.looseEnd} onHandle={d.handleLooseEnd} onDismiss={d.dismissLooseEnd} />
            <div className="deck-toolbar">
              <button className="pile-open" onClick={() => setDrawerOpen(true)}>↧ Flick from the pile</button>
            </div>
            <DeckView d={d} onFocus={focus} />
            <p className="held-foot">Everything you've captured is held in your vault — the deck is only what you chose.</p>
          </>
        )}
        {view === "now" && <RightNow d={d} nowTask={nowTask} setNowTask={setNowTask} />}
        {view === "projects" && <ProjectsView projects={d.projects} onOpen={setOpenProject} onAdd={d.addProject} />}
        {view === "calendar" && <CalendarView days={d.calendarDays} events={d.events} onSetDay={d.setCalendarDay} />}
        {view === "workspace" && <WorkspaceView d={d} />}
        {view === "scratch" && <ScratchpadView content={d.scratchContent} onSave={d.saveScratch} />}
      </main>

      <CaptureFab mode={captureMode} setMode={setCaptureMode} onDump={d.createCapture} onTodo={d.appendRunning} />

      {drawerOpen && (
        <RunningListDrawer
          content={d.runningContent}
          onWrite={d.writeRunning}
          onClose={() => setDrawerOpen(false)}
          onPull={(tier, text) => d.addCard(tier, text)}
        />
      )}

      {openProject && (
        <ProjectWall
          wall={openProject}
          deep={deep}
          onSaveWall={(content) => d.saveWall(openProject.id, content)}
          onFlickDeck={(text) => d.addCard("move", text, "today")}
          onFlickNow={flickNow}
          onCapture={(tier, text) => d.addCard(tier, text)}
          onOpenDeep={() => setDeepOpen(true)}
          onClose={() => setOpenProject(null)}
        />
      )}

      {openProject && deepOpen && deep && (
        <ProjectNote
          note={deep}
          onClose={() => setDeepOpen(false)}
          onPullNow={flickNow}
          onPullDeck={(text) => d.addCard("move", text, "today")}
        />
      )}
    </div>
  );
}
