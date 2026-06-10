import { useCallback, useEffect, useState } from "react";
import { ApiError, type VaultApi } from "./api";
import { cardFromNote, capturePath, deckPath, isDeckCard, type DeckCard } from "./deck";
import { parseUpcoming, type DatedItem } from "./dates";
import type { Horizon, Note } from "./types";
import {
  CAPTURE_TAG,
  DECK_TAG,
  RUNNING_PATH,
  RUNNING_TAG,
  STATUS_TAG,
  TODO_SCAN_TAG,
  LOOSE_END_TAGS,
  deckTag,
} from "./types";

// The deck's whole world. The vault holds everything; this hook reads only what
// the deck needs — its own cards (tag `deck`), projects (`status`), the one
// running-list note, plus two READ-ONLY surfaces: dated items for the time strip
// and `loose-end`/`admin` items for the quiet channel. Never the master lists.
export interface Deck {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  cards: DeckCard[];
  projects: Note[];
  runningContent: string;
  events: DatedItem[];
  looseEnd: Note | null; // the single oldest untouched loose end
  reload: () => Promise<void>;

  addCard: (horizon: Horizon, text: string) => Promise<void>;
  toggleCard: (card: DeckCard) => Promise<void>;
  moveCard: (card: DeckCard, horizon: Horizon) => Promise<void>;
  removeCard: (card: DeckCard) => Promise<void>;

  createCapture: (text: string) => Promise<void>;
  appendRunning: (text: string) => Promise<void>;
  writeRunning: (text: string) => Promise<void>;

  // quiet channel
  handleLooseEnd: (note: Note) => Promise<void>;
  dismissLooseEnd: (note: Note) => Promise<void>;
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
      const [deckNotes, statusNotes, running, scanNotes, looseNotes] = await Promise.all([
        api.queryNotes({ tag: DECK_TAG, includeContent: true, limit: 300 }),
        api.queryNotes({ tag: STATUS_TAG, includeContent: true, limit: 50 }),
        loadOrCreateRunning(api),
        api.queryNotes({ tag: TODO_SCAN_TAG, includeContent: true, limit: 200 }),
        loadLooseEnds(api),
      ]);

      cardNotes.clear();
      const deck = deckNotes.filter(isDeckCard);
      deck.forEach((n) => cardNotes.set(n.id, n));
      setCards(deck.map(cardFromNote));
      setProjects(statusNotes.filter((n) => n.tags.includes(STATUS_TAG)));
      setRunningContent(running.content ?? "");
      setRunningId(running.id);
      setRunningUpdatedAt(running.updatedAt);
      setEvents(parseUpcoming([...scanNotes, ...statusNotes]));
      // Oldest-touched first — the thing that's been rotting longest.
      setLooseEnds(
        looseNotes.sort((a, b) => ts(a.updatedAt) - ts(b.updatedAt)),
      );
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
        tags: [deckTag(horizon)],
        metadata: { done: false, order: Date.now() },
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
        tags: [deckTag(horizon)],
        metadata: { order: Date.now() },
        ifUpdatedAt: updatedAt(card.id),
      }),
    );
  }

  async function removeCard(card: DeckCard) {
    await guard(() => api.deleteNote(card.id));
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
    const next = runningContent.trim()
      ? `${runningContent.replace(/\s+$/, "")}\n- ${body}\n`
      : `- ${body}\n`;
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

  // Quiet channel. "Touching" a loose end bumps its updated_at, which rotates it
  // to the back of the oldest-first queue so the next one surfaces.
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
        tags: [deckTag("today")],
        metadata: { done: false, order: Date.now() },
      });
      await touch(note);
    });
  }

  async function dismissLooseEnd(note: Note) {
    await guard(() => touch(note));
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
    createCapture,
    appendRunning,
    writeRunning,
    handleLooseEnd,
    dismissLooseEnd,
  };
}

function ts(s?: string): number {
  return s ? Date.parse(s) : 0;
}

export function looseEndLabel(note: Note): string {
  const m = (note.content ?? "").match(/^#[ \t]+(.+?)[ \t]*$/m);
  return (m ? m[1] : note.title).replace(/\*\*/g, "").trim();
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
