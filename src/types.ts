// Normalized note shape used throughout the app. The vault REST API returns
// snake_case timestamps and a few fields only on the single-note endpoint;
// `normalizeNote` in api.ts maps everything onto this one shape.
export interface Note {
  id: string;
  path: string;
  title: string; // derived from the path basename
  content?: string; // only present after a single-note fetch
  preview?: string;
  tags: string[];
  metadata: Record<string, unknown>;
  links?: NoteLink[];
  createdAt?: string;
  updatedAt?: string;
  byteSize?: number;
}

export interface NoteLink {
  target: string;
  relationship: string;
}

export interface TagInfo {
  name: string;
  count: number;
}

// OAuth scope vocabulary, per parachute's oauth-scopes pattern.
export type TokenScope = string;
export const DEFAULT_SCOPE: TokenScope = "vault:read vault:write";

export interface StoredToken {
  accessToken: string;
  expiresAt?: number;
  refreshToken?: string;
  scope: TokenScope;
  vault?: string;
}

export interface AuthSession {
  vaultUrl: string;
  issuer?: string;
  tokenEndpoint?: string;
  clientId?: string;
  token: StoredToken;
}

export interface AuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  code_challenge_methods_supported?: string[];
}

export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  scope: TokenScope;
  vault?: string;
  refresh_token?: string;
  expires_in?: number;
  services?: Record<string, { url?: string } | undefined>;
}

export interface PendingOAuth {
  issuerUrl: string;
  issuer: string;
  tokenEndpoint: string;
  clientId: string;
  codeVerifier: string;
  state: string;
  redirectUri: string;
  scope: TokenScope;
  startedAt: string;
}

// --- Adam Deck domain --------------------------------------------------------
//
// The deck is a clean room. Deck cards are the deck's OWN notes, tagged under a
// dedicated `deck/<horizon>` namespace, so the deck only ever reads `tag: deck`
// — it can never inhale the master/running lists (tagged differently).

export type Horizon = "today" | "week" | "later";

export const HORIZONS: { key: Horizon; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "later", label: "Later" },
];

export const HORIZON_LABEL: Record<Horizon, string> = {
  today: "Today",
  week: "This Week",
  later: "Later",
};

export const DECK_TAG = "deck";
export const deckTag = (h: Horizon): string => `${DECK_TAG}/${h}`;

// The ONE running-list note: ✅ Quick To-Do appends to it, the drawer fishes
// from it. Its own tag so it never shows up as a deck card.
export const RUNNING_TAG = "running-list";
export const RUNNING_PATH = "running-list";

// 🧠 Brain Dump → a new note tagged `capture`, fired into the vault.
export const CAPTURE_TAG = "capture";

// Projects view reads the existing reference notes tagged `status` (the "deep
// note"). Each project is a thin `project` note (the wall: where it's at / next
// steps) that LINKS to a deep note via metadata.deep — the deep note is never
// edited. The global Scratchpad is one freeform note.
export const STATUS_TAG = "status";
export const SKETCH_TAG = "sketchpad";
export const PROJECT_TAG = "project";
export const SCRATCH_TAG = "scratchpad";
export const SCRATCH_PATH = "scratchpad";

// READ-ONLY surfaces (never pulled onto the deck automatically):
// the time strip scans dated items out of these notes...
export const TODO_SCAN_TAG = "todo";
// ...and the quiet channel surfaces the oldest of these (one at a time).
export const LOOSE_END_TAGS = ["loose-end", "admin"];
