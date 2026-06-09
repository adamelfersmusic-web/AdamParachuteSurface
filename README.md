# Adam Deck

A calm, ADHD-friendly morning dashboard for Adam's Parachute vault. Open it,
and instantly know your next move.

It does exactly two things:

1. **Two project cards** — read live from the notes tagged `status`
   (`Atelier/status/jonathan-gaietto-status` and `Amanda — Status`). Each card
   shows the project name, the #1 item from *This Week's Priorities* as a big
   **Next action**, the remaining priorities, and the *Open Loops* list. Click a
   card to expand the full status note as rendered markdown.
2. **A Today / This Week / Later to-do board** — each todo is its own note
   tagged `todo` with `when` (`today` | `this-week` | `later`) and `done`
   metadata, created under `todos/`. Add a todo to a column, check it off, or
   move it between columns — every action writes back to the vault. The vault's
   big "MASTER TO-DO LIST" notes are also tagged `todo`; the board excludes them
   by only showing todos that carry a `when` field or live under `todos/`.

## How it connects

Static React + Vite. On first load it runs OAuth 2.1 + PKCE with dynamic client
registration against your hub; the token lives only in `localStorage` and is
sent only to your vault's REST API at `{vaultBase}/api/notes`. The connection
layer (`api.ts`, `auth.ts`, `oauth.ts`, `config.ts`, `markdown.tsx`,
`ConfigScreen.tsx`) is the proven Parachute plumbing, reused as-is.

## Develop

```bash
npm install
npm run dev        # local dev server (OAuth needs https or localhost)
npm run build      # typecheck + vite build → dist/
```

## Deploy

Vite builds with a relative `base: "./"`, and `.github/workflows/deploy.yml`
publishes `dist/` to GitHub Pages on every push to `main`. One-time setup:
**Settings → Pages → Source → GitHub Actions**.

Live URL: https://adamelfersmusic-web.github.io/AdamParachuteSurface/
