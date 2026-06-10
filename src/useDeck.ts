import { useCallback, useEffect, useState } from "react";
import { ApiError, type VaultApi } from "./api";
import { cardFromNote, capturePath, deckPath, isDeckCard, type DeckCard } from "./deck";
import type { Horizon, Note } from "./types";
import {
  CAPTURE_TAG,
  DECK_TAG,
  RUNNING_PATH,
  RUNNING_TAG,
  STATUS_TAG,
  deckTag,
} from "./types";

// The deck's whole world. The vault holds everything; this hook reads only the
// deck's own notes (tag `deck`), the projects (tag `status`), and the one
// running-list note — never the master to-do lists. Every mutation writes to the
// vault, then reloads.
export interface Deck {
  loading: boolean;
  error: string | null;
  clearError: () => void;
  cards: DeckCard[];
  projects: Note[];
  runningContent: string;
  reload: () => Promise<void>;

  // deck (clean room)
  addCard: (horizon: Horizon, text: string) => Promise<void>;
  toggleCard: (card: DeckCard) => Promise<void>;
  moveCard: (card: DeckCard, horizon: Horizon) => Promise<void>;
  removeCard: (card: DeckCard) => Promise<void>;

  // capture → vault
  createCapture: (text: string) => Promise<void>;

  // running list (the one note)
  appendRunning: (text: string) => Promise<void>;
  writeRunning: (text: string) => Promise<void>;
}

export function useDeck(api: VaultApi): Deck {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cards, setCards] = useState<DeckCard[]>([]);
  const [projects, setProjects] = useState<Note[]>([]);
  const [runningContent, setRunningContent] = useState("");
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runningUpdatedAt, setRunningUpdatedAt] = useState<string | undefined>();
  const cardNotes = useState<Map<string, Note>>(() => new Map())[0];

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deckNotes, statusNotes, running] = await Promise.all([
        api.queryNotes({ tag: DECK_TAG, includeContent: true, limit: 300 }),
        api.queryNotes({ tag: STATUS_TAG, includeContent: true, limit: 50 }),
        loadOrCreateRunning(api),
      ]);
      cardNotes.clear();
      const deck = deckNotes.filter(isDeckCard);
      deck.forEach((n) => cardNotes.set(n.id, n));
      setCards(deck.map(cardFromNote));
      setProjects(statusNotes.filter((n) => n.tags.includes(STATUS_TAG)));
      setRunningContent(running.content ?? "");
      setRunningId(running.id);
      setRunningUpdatedAt(running.updatedAt);
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
      api.updateNote(card.id, {
        metadata: { done: !card.done },
        ifUpdatedAt: updatedAt(card.id),
      }),
    );
  }

  async function moveCard(card: DeckCard, horizon: Horizon) {
    if (card.horizon === horizon) return;
    // Tags are a full replace; a deck card only carries its one deck tag, so we
    // simply swap it to the new horizon. order resets so it lands at the bottom.
    await guard(() =>
      api.updateNote(card.id, {
        tags: [deckTag(horizon)],
        metadata: { order: Date.now() },
        ifUpdatedAt: updatedAt(card.id),
      }),
    );
  }

  async function removeCard(card: DeckCard) {
    // Deck cards are disposable curation — the canonical task lives in your
    // running list / project, so taking it off the deck deletes the little card.
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
    const next = runningContent.trim() ? `${runningContent.replace(/\s+$/, "")}\n- ${body}\n` : `- ${body}\n`;
    try {
      const updated = await api.updateNote(runningId, {
        content: next,
        ifUpdatedAt: runningUpdatedAt,
      });
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
      const updated = await api.updateNote(runningId, {
        content: text,
        ifUpdatedAt: runningUpdatedAt,
      });
      setRunningContent(updated.content ?? text);
      setRunningUpdatedAt(updated.updatedAt);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      await reload();
    }
  }

  return {
    loading,
    error,
    clearError: () => setError(null),
    cards,
    projects,
    runningContent,
    reload,
    addCard,
    toggleCard,
    moveCard,
    removeCard,
    createCapture,
    appendRunning,
    writeRunning,
  };
}

async function findByTag(api: VaultApi, tag: string): Promise<Note | null> {
  const matches = await api.queryNotes({ tag, includeContent: true, limit: 10 });
  return matches.find((n) => n.tags.includes(tag)) ?? null;
}

async function loadOrCreateRunning(api: VaultApi): Promise<Note> {
  const existing = await findByTag(api, RUNNING_TAG);
  if (existing) return existing;
  try {
    return await api.createNote({
      path: RUNNING_PATH,
      content: "",
      tags: [RUNNING_TAG],
      metadata: {},
    });
  } catch (e) {
    if (e instanceof ApiError && (e.status === 409 || e.conflict)) {
      const again = await findByTag(api, RUNNING_TAG);
      if (again) return again;
    }
    throw e;
  }
}
