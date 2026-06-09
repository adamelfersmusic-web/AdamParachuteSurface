// Normalized note shape used throughout the app. The vault REST API returns
// snake_case timestamps and a few fields only on the single-note endpoint;
// `normalizeNote` in api.ts maps everything onto this one shape.
export interface Note {
  id: string;
  path: string;
  title: string; // derived from the path basename
  content?: string; // only present after a single-note fetch
  preview?: string; // ~120 char snippet from list endpoint
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

// OAuth scope vocabulary, per parachute's oauth-scopes pattern. The vault also
// honors the legacy "full" synonym, but we request the current vocabulary.
export type TokenScope = string;
export const DEFAULT_SCOPE: TokenScope = "vault:read vault:write";

// Persisted token envelope (mirrors surface-client's StoredToken).
export interface StoredToken {
  accessToken: string;
  /** Absolute UTC ms (`Date.now()` baseline): now + expires_in * 1000. */
  expiresAt?: number;
  refreshToken?: string;
  scope: TokenScope;
  vault?: string;
}

// What we persist for a connected vault. `issuer`/`tokenEndpoint`/`clientId`
// are present for OAuth sessions (needed to silently refresh); a pasted-token
// session has just the vault URL + access token.
export interface AuthSession {
  vaultUrl: string; // base for /api calls, e.g. https://hub/vault/adam
  issuer?: string;
  tokenEndpoint?: string;
  clientId?: string;
  token: StoredToken;
}

// RFC 8414 Authorization Server metadata (the subset we use).
export interface AuthServerMetadata {
  issuer: string;
  authorization_endpoint: string;
  token_endpoint: string;
  registration_endpoint: string;
  code_challenge_methods_supported?: string[];
}

// Token-endpoint response (RFC 6749 §4.1.4 + hub `services`/`vault` extensions).
export interface TokenResponse {
  access_token: string;
  token_type: "bearer";
  scope: TokenScope;
  vault?: string;
  refresh_token?: string;
  expires_in?: number;
  services?: Record<string, { url?: string } | undefined>;
}

// PKCE + flow state stashed in sessionStorage between redirect and callback.
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

// "Active Projects (next 2 weeks)" is a single free-text note the user types
// into directly. It lives at a fixed path and is created on first use if it
// doesn't exist yet.
export const DASHBOARD_TAG = "dashboard";
export const ACTIVE_PROJECTS_PATH = "dashboard/active-projects";
export const ACTIVE_PROJECTS_SEED =
  "# Active Projects — Next 2 Weeks\n\n" +
  "_Type anything here. This is yours — it saves to your vault when you click away._\n\n" +
  "- \n";

// Each todo is its own note tagged `todo`, with `when` + `done` metadata, living
// under todos/. The board only ever shows todos that look like board todos (see
// isBoardTodo in todos.ts) — the vault's big "MASTER TO-DO LIST" notes are also
// tagged `todo` and must stay off the board.
export const TODO_TAG = "todo";
export const TODOS_PATH_PREFIX = "todos/";

// The three columns, in board order. `when` metadata on a todo note is one of
// these literals.
export const TODO_COLUMNS = ["today", "this-week", "later"] as const;
export type TodoWhen = (typeof TODO_COLUMNS)[number];

export const COLUMN_LABEL: Record<TodoWhen, string> = {
  today: "Today",
  "this-week": "This Week",
  later: "Later",
};
