# WanderDebate

WanderDebate is a Nuxt 3 app where opinionated travel agents debate and refine an itinerary in turns.

Authenticated users can own multiple itineraries. New itinerary creation is rate-limited to 3 per UTC day per user.
For testing, this limit can be toggled via `NUXT_DAILY_ITINERARY_LIMIT_ENABLED` (default: `TRUE`).
At trip setup, users can choose the LLM provider per itinerary (`mistral` or `minimax`).

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
- `NUXT_MINIMAX_API_KEY` to a real MiniMax API key (only needed if selecting MiniMax)
- `NUXT_MINIMAX_BASE_URL` (optional, defaults to `https://api.minimax.io/v1`)
- `NUXT_DAILY_ITINERARY_LIMIT_ENABLED` to `TRUE` (default) or `FALSE` for testing without quota

4. Run the app:

```bash
pnpm dev
```

5. Create an account in the app (email/password) and sign in before creating itineraries.

## Local Demo Users

After `supabase db reset --local`, these users are available from `supabase/seed.sql`:

- `test1@test.com` / `testtest123`
- `test2@test.com` / `testtest123`

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
