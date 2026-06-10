import { useCallback, useEffect, useState } from "react";
import { ApiError, type VaultApi } from "./api";
import {
  cardContent,
  cardFromNote,
  capturePath,
  deckPath,
  isDeckCard,
  projectTitle,
  type DeckCard,
} from "./deck";
import { parseUpcoming, type DatedItem } from "./dates";
import type { Horizon, Note } from "./types";
import {
  CAPTURE_TAG,
  DECK_TAG,
  HORIZONS,
  PROJECT_TAG,
  RUNNING_PATH,
  RUNNING_TAG,
  SCRATCH_PATH,
  SCRATCH_TAG,
  STATUS_TAG,
  TODO_SCAN_TAG,
  LOOSE_END_TAGS,
  deckTag,
} from "./types";

export interface Deck {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  cards: DeckCard[];
  projects: Note[]; // the thin "wall" notes
  runningContent: string;
  scratchContent: string;
  events: DatedItem[];
  looseEnd: Note | null;
  reload: () => Promise<void>;

  addCard: (horizon: Horizon, text: string) => Promise<void>;
  toggleCard: (card: DeckCard) => Promise<void>;
  moveCard: (card: DeckCard, horizon: Horizon) => Promise<void>;
  removeCard: (card: DeckCard) => Promise<void>;
  saveCardNotes: (card: DeckCard, notes: string) => Promise<void>;

  createCapture: (text: string) => Promise<void>;
  appendRunning: (text: string) => Promise<void>;
  writeRunning: (text: string) => Promise<void>;

  handleLooseEnd: (note: Note) => Promise<void>;
  dismissLooseEnd: (note: Note) => Promise<void>;

  // projects: wall (this `project` note) + deep (the linked status note, untouched)
  addProject: (name: string) => Promise<void>;
  saveWall: (id: string, content: string) => Promise<Note>;
  findDeep: (wall: Note) => Note | null;

  // global scratchpad (one note, two framings: Scratchpad room + Workspace)
  saveScratch: (content: string) => Promise<void>;
  appendScratch: (text: string) => Promise<void>;
}

export function useDeck(api: VaultApi): Deck {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [projects, setProjects] = useState<Note[]>([]);
  const [deepNotes, setDeepNotes] = useState<Note[]>([]);
  const [runningContent, setRunningContent] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningUpdatedAt, setRunningUpdatedAt] = useState<string | undefined>();
  const [scratchContent, setScratchContent] = useState("");
  const [scratchId, setScratchId] = useState<string | null>(null);
  const [scratchUpdatedAt, setScratchUpdatedAt] = useState<string | undefined>();
  const [events, setEvents] = useState<DatedItem[]>([]);
  const [looseEnds, setLooseEnds] = useState<Note[]>([]);
  const cardNotes = useState<Map<string, Note>>(() => new Map())[0];

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [projectNotes, statusNotes, running, scratch, scanNotes, looseNotes, deckNotes] =
        await Promise.all([
          api.queryNotes({ tag: PROJECT_TAG, includeContent: true, limit: 100 }),
          api.queryNotes({ tag: STATUS_TAG, includeContent: true, limit: 50 }),
          loadOrCreate(api, RUNNING_TAG, RUNNING_PATH),
          loadOrCreate(api, SCRATCH_TAG, SCRATCH_PATH),
          api.queryNotes({ tag: TODO_SCAN_TAG, includeContent: true, limit: 200 }),
          loadLooseEnds(api),
          loadDeckCards(api),
        ]);

      cardNotes.clear();
      deckNotes.forEach((n) => cardNotes.set(n.id, n));
      setCards(deckNotes.map(cardFromNote));

      const status = statusNotes.filter((n) => n.tags.includes(STATUS_TAG));
      setDeepNotes(status);
      // Auto-create a thin wall for each deep note that lacks one. The deep note
      // itself is NEVER touched — we only link to it.
      const walls = await ensureWalls(api, projectNotes.filter((n) => n.tags.includes(PROJECT_TAG)), status);
      setProjects(walls);

      setRunningContent(running.content ?? "");
      setRunningId(running.id);
      setRunningUpdatedAt(running.updatedAt);
      setScratchContent(scratch.content ?? "");
      setScratchId(scratch.id);
      setScratchUpdatedAt(scratch.updatedAt);
      setEvents(parseUpcoming([...scanNotes, ...status]));
      setLooseEnds(looseNotes.sort((a, b) => ts(a.updatedAt) - ts(b.updatedAt)));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [api, cardNotes]);

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

  function updatedAt(id: string): string | undefined {
    return cardNotes.get(id)?.updatedAt;
  }

  async function addCard(horizon: Horizon, text: string) {
    const body = text.trim();
    if (!body) return;
    await guard(() =>
      api.createNote({
        path: deckPath(body),
        content: `# ${body}\n`,
        tags: [DECK_TAG],
        metadata: { horizon, done: false, order: Date.now() },
      }),
    );
  }

  async function toggleCard(card: DeckCard) {
    await guard(() =>
      api.updateNote(card.id, { metadata: { done: !card.done }, ifUpdatedAt: updatedAt(card.id) }),
    );
  }

  async function moveCard(card: DeckCard, horizon: Horizon) {
    if (card.horizon === horizon) return;
    await guard(() =>
      api.updateNote(card.id, {
        metadata: { horizon, order: Date.now() },
        ifUpdatedAt: updatedAt(card.id),
      }),
    );
  }

  async function removeCard(card: DeckCard) {
    await guard(() => api.deleteNote(card.id));
  }

  async function saveCardNotes(card: DeckCard, notes: string) {
    if (notes === card.notes) return;
    await guard(() =>
      api.updateNote(card.id, { content: cardContent(card.text, notes), ifUpdatedAt: updatedAt(card.id) }),
    );
  }

  async function createCapture(text: string) {
    const body = text.trim();
    if (!body) return;
    const stamp = new Date().toISOString().slice(0, 16).replace("T", " ");
    await guard(() =>
      api.createNote({
        path: capturePath(body),
        content: `${body}\n\n_captured ${stamp}_\n`,
        tags: [CAPTURE_TAG],
        metadata: {},
      }),
    );
  }

  async function appendRunning(text: string) {
    const body = text.trim();
    if (!body || !runningId) return;
    const next = runningContent.trim() ? `- ${body}\n${runningContent.replace(/^\s+/, "")}` : `- ${body}\n`;
    await writeNote(runningId, next, runningUpdatedAt, setRunningContent, setRunningUpdatedAt);
  }

  async function writeRunning(text: string) {
    if (!runningId || text === runningContent) return;
    await writeNote(runningId, text, runningUpdatedAt, setRunningContent, setRunningUpdatedAt);
  }

  async function saveScratch(text: string) {
    if (!scratchId || text === scratchContent) return;
    await writeNote(scratchId, text, scratchUpdatedAt, setScratchContent, setScratchUpdatedAt);
  }

  async function appendScratch(text: string) {
    const body = text.trim();
    if (!body || !scratchId) return;
    const next = scratchContent.trim() ? `${scratchContent.replace(/\s+$/, "")}\n${body}\n` : `${body}\n`;
    await writeNote(scratchId, next, scratchUpdatedAt, setScratchContent, setScratchUpdatedAt);
  }

  // Shared note-content writer with local-state sync + conflict recovery.
  async function writeNote(
    id: string,
    content: string,
    prevUpdated: string | undefined,
    setContent: (s: string) => void,
    setUpdated: (s: string | undefined) => void,
  ) {
    try {
      const updated = await api.updateNote(id, { content, ifUpdatedAt: prevUpdated });
      setContent(updated.content ?? content);
      setUpdated(updated.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await reload();
    }
  }

  function touch(note: Note) {
    return api.updateNote(note.id, {
      metadata: { nudged_at: new Date().toISOString() },
      ifUpdatedAt: note.updatedAt,
    });
  }

  async function handleLooseEnd(note: Note) {
    const label = looseEndLabel(note);
    await guard(async () => {
      await api.createNote({
        path: deckPath(label),
        content: `# ${label}\n`,
        tags: [DECK_TAG],
        metadata: { horizon: "today", done: false, order: Date.now() },
      });
      await touch(note);
    });
  }

  async function dismissLooseEnd(note: Note) {
    await guard(() => touch(note));
  }

  async function addProject(name: string) {
    const n = name.trim();
    if (!n) return;
    await guard(() =>
      api.createNote({
        path: `projects/${slug(n)}`,
        content: `# ${n}\n\n## Where it's at\n\n## Next steps\n`,
        tags: [PROJECT_TAG],
        metadata: {},
      }),
    );
  }

  function saveWall(id: string, content: string): Promise<Note> {
    return api.updateNote(id, { content });
  }

  function findDeep(wall: Note): Note | null {
    const deep = wall.metadata?.deep;
    if (!deep) return null;
    return deepNotes.find((n) => n.id === String(deep)) ?? null;
  }

  return {
    loading,
    error,
    clearError: () => setError(null),
    cards,
    projects,
    runningContent,
    scratchContent,
    events,
    looseEnd: looseEnds[0] ?? null,
    reload,
    addCard,
    toggleCard,
    moveCard,
    removeCard,
    saveCardNotes,
    createCapture,
    appendRunning,
    writeRunning,
    handleLooseEnd,
    dismissLooseEnd,
    addProject,
    saveWall,
    findDeep,
    saveScratch,
    appendScratch,
  };
}

function ts(s?: string): number {
  return s ? Date.parse(s) : 0;
}

function slug(text: string): string {
  return (
    text.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "project"
  ) + "-" + Math.random().toString(36).slice(2, 6);
}

export function looseEndLabel(note: Note): string {
  const m = (note.content ?? "").match(/^#[ \t]+(.+?)[ \t]*$/m);
  return (m ? m[1] : note.title).replace(/\*\*/g, "").trim();
}

async function ensureWalls(api: VaultApi, walls: Note[], deepNotes: Note[]): Promise<Note[]> {
  const linked = new Set(walls.map((w) => String(w.metadata?.deep)).filter((x) => x && x !== "undefined"));
  const created: Note[] = [];
  for (const deep of deepNotes) {
    if (linked.has(deep.id)) continue;
    const name = projectTitle(deep);
    created.push(
      await api.createNote({
        path: `projects/${slug(name)}`,
        content: `# ${name}\n\n## Where it's at\n\n## Next steps\n`,
        tags: [PROJECT_TAG],
        metadata: { deep: deep.id },
      }),
    );
  }
  return [...walls, ...created];
}

async function loadDeckCards(api: VaultApi): Promise<Note[]> {
  const tags = [DECK_TAG, ...HORIZONS.map((h) => deckTag(h.key))];
  const lists = await Promise.all(
    tags.map((t) => api.queryNotes({ tag: t, includeContent: true, limit: 200 })),
  );
  const byId = new Map<string, Note>();
  for (const list of lists) for (const n of list) if (isDeckCard(n)) byId.set(n.id, n);
  return [...byId.values()];
}

async function loadLooseEnds(api: VaultApi): Promise<Note[]> {
  const lists = await Promise.all(
    LOOSE_END_TAGS.map((t) => api.queryNotes({ tag: t, includeContent: true, limit: 50 })),
  );
  const byId = new Map<string, Note>();
  for (const list of lists) for (const n of list) byId.set(n.id, n);
  return [...byId.values()];
}

async function findByTag(api: VaultApi, tag: string): Promise<Note | null> {
  const matches = await api.queryNotes({ tag, includeContent: true, limit: 10 });
  return matches.find((n) => n.tags.includes(tag)) ?? null;
}

async function loadOrCreate(api: VaultApi, tag: string, path: string): Promise<Note> {
  const existing = await findByTag(api, tag);
  if (existing) return existing;
  try {
    return await api.createNote({ path, content: "", tags: [tag], metadata: {} });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 409 || e.conflict)) {
      const again = await findByTag(api, tag);
      if (again) return again;
    }
    throw e;
  }
}
