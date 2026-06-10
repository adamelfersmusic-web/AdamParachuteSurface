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
  RUNNING_PATH,
  RUNNING_TAG,
  SKETCH_TAG,
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
  projects: Note[];
  runningContent: string;
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

  // projects: sketchpad (opens by default) + deep note (status note)
  loadSketch: (project: Note) => Promise<Note>;
  saveSketch: (id: string, content: string) => Promise<Note>;
}

export function useDeck(api: VaultApi): Deck {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [projects, setProjects] = useState<Note[]>([]);
  const [runningContent, setRunningContent] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningUpdatedAt, setRunningUpdatedAt] = useState<string | undefined>();
  const [events, setEvents] = useState<DatedItem[]>([]);
  const [looseEnds, setLooseEnds] = useState<Note[]>([]);
  const cardNotes = useState<Map<string, Note>>(() => new Map())[0];

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [statusNotes, running, scanNotes, looseNotes, deckNotes] = await Promise.all([
        api.queryNotes({ tag: STATUS_TAG, includeContent: true, limit: 50 }),
        loadOrCreateRunning(api),
        api.queryNotes({ tag: TODO_SCAN_TAG, includeContent: true, limit: 200 }),
        loadLooseEnds(api),
        loadDeckCards(api),
      ]);

      cardNotes.clear();
      deckNotes.forEach((n) => cardNotes.set(n.id, n));
      setCards(deckNotes.map(cardFromNote));
      setProjects(statusNotes.filter((n) => n.tags.includes(STATUS_TAG)));
      setRunningContent(running.content ?? "");
      setRunningId(running.id);
      setRunningUpdatedAt(running.updatedAt);
      setEvents(parseUpcoming([...scanNotes, ...statusNotes]));
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

  // Move = a metadata update (reliable on this vault), never a re-tag.
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
      api.updateNote(card.id, {
        content: cardContent(card.text, notes),
        ifUpdatedAt: updatedAt(card.id),
      }),
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

  // Newest at the top of the pile.
  async function appendRunning(text: string) {
    const body = text.trim();
    if (!body || !runningId) return;
    const next = runningContent.trim() ? `- ${body}\n${runningContent.replace(/^\s+/, "")}` : `- ${body}\n`;
    try {
      const updated = await api.updateNote(runningId, { content: next, ifUpdatedAt: runningUpdatedAt });
      setRunningContent(updated.content ?? next);
      setRunningUpdatedAt(updated.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await reload();
    }
  }

  async function writeRunning(text: string) {
    if (!runningId || text === runningContent) return;
    try {
      const updated = await api.updateNote(runningId, { content: text, ifUpdatedAt: runningUpdatedAt });
      setRunningContent(updated.content ?? text);
      setRunningUpdatedAt(updated.updatedAt);
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

  // The sketchpad for a project: a small note linked by metadata.project. Found
  // or created on demand; it does NOT trigger a deck reload.
  async function loadSketch(project: Note): Promise<Note> {
    const sketches = await api.queryNotes({ tag: SKETCH_TAG, includeContent: true, limit: 100 });
    const found = sketches.find((s) => String(s.metadata?.project) === project.id);
    if (found) return found;
    const title = projectTitle(project);
    const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "project";
    return api.createNote({
      path: `deck/sketch/${slug}-${Math.random().toString(36).slice(2, 6)}`,
      content: "",
      tags: [SKETCH_TAG],
      metadata: { project: project.id },
    });
  }

  function saveSketch(id: string, content: string): Promise<Note> {
    return api.updateNote(id, { content });
  }

  return {
    loading,
    error,
    clearError: () => setError(null),
    cards,
    projects,
    runningContent,
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
    loadSketch,
    saveSketch,
  };
}

function ts(s?: string): number {
  return s ? Date.parse(s) : 0;
}

export function looseEndLabel(note: Note): string {
  const m = (note.content ?? "").match(/^#[ \t]+(.+?)[ \t]*$/m);
  return (m ? m[1] : note.title).replace(/\*\*/g, "").trim();
}

// Read deck cards by querying each horizon sub-tag directly. The parent `deck`
// tag does NOT roll its children up on this vault, so a `tag: deck` query
// returns nothing — we ask for the exact tags we wrote.
async function loadDeckCards(api: VaultApi): Promise<Note[]> {
  // Query the flat `deck` tag (current shape) plus the older `deck/<horizon>`
  // sub-tags so existing cards still load. Merge by id.
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

async function loadOrCreateRunning(api: VaultApi): Promise<Note> {
  const existing = await findByTag(api, RUNNING_TAG);
  if (existing) return existing;
  try {
    return await api.createNote({ path: RUNNING_PATH, content: "", tags: [RUNNING_TAG], metadata: {} });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 409 || e.conflict)) {
      const again = await findByTag(api, RUNNING_TAG);
      if (again) return again;
    }
    throw e;
  }
}
