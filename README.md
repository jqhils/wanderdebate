# WanderDebate

WanderDebate is a Nuxt 3 app where opinionated travel agents debate and refine an itinerary in turns.

## Tech Stack

- Nuxt 3 + Vue 3 + TypeScript
- Nuxt UI (`@nuxt/ui`)
- Pinia
- Supabase (database + realtime)
- Mistral API (`@mistralai/mistralai`)

## Prerequisites

- Node.js 22+ (tested with Node 24)
- `pnpm` 10+
- Docker Desktop (for local Supabase)
- Supabase CLI (`supabase`)

## Quick Start

1. Install dependencies:

```bash
pnpm install
```

2. Start local Supabase (first run):

```bash
supabase init
supabase start
supabase db reset --local
```

3. Copy env template and fill values:

```bash
cp .env.example .env
```

Set:
- `SUPABASE_URL` to local API URL (from `supabase status -o env`, `API_URL`)
- `SUPABASE_KEY` to anon key (`ANON_KEY`)
- `SUPABASE_SECRET_KEY` to server secret (`SECRET_KEY`)
- `NUXT_MISTRAL_API_KEY` to a real Mistral API key

4. Run the app:

```bash
pnpm dev
```

## Useful Commands

```bash
pnpm dev
pnpm typecheck
pnpm build
pnpm preview
```

Supabase:

```bash
supabase status
supabase db reset --local
supabase stop
```

## Project Layout

- `app/` client app (pages, components, composables, stores, utils)
- `server/` server utilities and API handlers
- `app/server/api/` Nuxt API route entrypoints
- `supabase/migrations/` SQL migrations
- `app/utils/schemas.ts` shared Zod schemas and inferred TS types

## Notes for Contributors

- Use `pnpm` (do not mix lock files).
- Keep API keys/secrets out of Git (`.env` is ignored).
- Run `pnpm typecheck` and `pnpm build` before opening a PR.
- See [`CONTRIBUTING.md`](./CONTRIBUTING.md) for workflow details.
