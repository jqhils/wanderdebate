# Contributing

## Workflow

1. Create a branch from `main`.
2. Keep changes scoped to one concern per PR.
3. Open a PR with clear testing notes.

## Local Setup

1. Install deps with `pnpm install`.
2. Start Supabase locally:
   - `supabase start`
   - `supabase db reset --local`
3. Configure `.env` from `.env.example`.

## Quality Gates

Before pushing:

```bash
pnpm typecheck
pnpm build
```

## Code Style

- TypeScript strict mode is enabled; avoid `any` unless justified.
- Reuse existing Zod schemas in `app/utils/schemas.ts`.
- Keep server-only logic under `server/`.
- Keep new secrets and local machine settings out of Git.

## Database Changes

- Add schema changes as new SQL files in `supabase/migrations/`.
- Keep migrations forward-only.
- Re-run `supabase db reset --local` after migration changes.

## Pull Request Checklist

- [ ] Scope is focused and documented
- [ ] `pnpm typecheck` passes
- [ ] `pnpm build` passes
- [ ] Env/config changes reflected in `.env.example` and/or README
