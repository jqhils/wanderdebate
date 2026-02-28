# WanderDebate Prompt Pack (Revised)

Use these prompts when working in Claude Code. They are aligned with `CLAUDE.md` and prioritize executable correctness.

---

## Kickoff Prompt (Phase 1 + Phase 2 Only)

```md
Read `CLAUDE.md` thoroughly before doing anything.

If any instruction conflicts with runtime/type correctness, prefer executable correctness and document the interpreted fix in your final summary.

We're building WanderDebate — a multi-agent travel itinerary planner.
Implement **Phase 1 and Phase 2 only**. Do not move to Phase 3+.

## Phase 1: Scaffold the project

1. Initialize Nuxt 3 in this directory (if needed):
   - `npx nuxi init . --force`
2. Install dependencies with pnpm:
   - `pnpm add @nuxt/ui @pinia/nuxt @vueuse/nuxt @formkit/auto-animate @nuxt/icon @nuxtjs/supabase zod @anthropic-ai/sdk markdown-it isomorphic-dompurify`
3. Configure `nuxt.config.ts`:
   - Register all modules from `CLAUDE.md`
   - Set `@nuxtjs/supabase` with `redirect: false`
   - Define runtime config keys for Anthropic + Supabase
4. Create `app.config.ts` with travel-themed colors:
   - Primary: warm amber/terracotta
   - Flaneur: muted sage green
   - Completionist: crisp blue
   - Master: neutral slate
5. Create `app/utils/schemas.ts` exactly from `CLAUDE.md`:
   - Keep `ChangesSummarySchema` defined before `ItineraryVersionSchema`
   - `changesSummary` must allow explicit `null` for version `0`
6. Create `app/utils/prompts.ts` with Flaneur/Completionist/Master prompt constants.
7. Create `supabase/migrations/001_initial.sql` from `CLAUDE.md`.
8. Create `.env.example` placeholders from `CLAUDE.md`.
9. If persona files are missing, add:
   - `FLANEUR_PERSONALITY.md`
   - `COMPLETIONIST_PERSONALITY.md`
   with TODO placeholders and baseline persona constraints.

## Phase 2: Build static UI with mock data

Build the component structure from `CLAUDE.md`:
- `app/components/setup/TripForm.vue`
- `app/components/chat/ChatPanel.vue`, `ChatMessage.vue`, `ChatInput.vue`, `AgentAvatar.vue`
- `app/components/itinerary/ItineraryPanel.vue`, `VersionSelector.vue`, `ItineraryTimeline.vue`, `ActivityCard.vue`, `ReasoningToggle.vue`, `ChangesSummary.vue`
- `app/pages/index.vue`
- `app/pages/session/[id].vue`

Use fixture data only (`app/utils/mockData.ts`). **No Supabase, no orchestrator, no Pinia store in Phase 2.**

### Setup page requirements (`app/pages/index.vue`)
- Centered card with header: "Traveling Where?"
- Destination input with search icon
- Duration control with:
  - presets: 24H, 48H, 72H
  - custom option in number of days
- Agent selector pills: "Slow" and "Fast", both selected by default, color-coded borders
- PLAN button navigates to `/session/mock`

### Session page requirements (`app/pages/session/[id].vue`)
- Desktop (`lg+`): side-by-side chat/itinerary panels
- Mobile: tabbed view with **Itinerary as default tab**

#### Chat panel
- Scrollable message list with alternating bubble alignment
- Each message includes avatar, agent name, role badge, timestamp
- Render message content as markdown
- Markdown must be sanitized strictly (no unsafe HTML/script execution)
- `@formkit/auto-animate` on message container
- Bottom input + SEND button for user messages (local mock behavior only)
- Continue Debate button present, disabled when mock debate is active

#### Itinerary panel
- Dot-based `VersionSelector` with left/right arrows
- Vertical timeline grouped by day
- `ActivityCard` includes time, title, description, agent origin indicator
- Reasoning toggle reveals/collapses `agentLogic`
- `ChangesSummary` shows dropped/added vs previous version
- Hide changes summary for version `0`

### Mock data requirements (`app/utils/mockData.ts`)
- Session: "Paris, 48h"
- Exactly 5 versions:
  1. Flaneur proposal (version 0)
  2. Completionist proposal (version 1)
  3. Master merge (version 2)
  4. Flaneur critique (version 3)
  5. Completionist critique (version 4)
- Each version: 2 days, 4-6 activities/day
- Version 0 uses `changesSummary: null`
- Later versions include realistic dropped/added summaries
- Include corresponding chat messages and 1-2 mock user inputs

## Quality gates (required)

At the end of each phase, run available checks and report results:
- typecheck (`pnpm exec nuxt typecheck` or project equivalent)
- lint (`pnpm lint` if script exists)
- build (`pnpm build` if script exists)

If a required prerequisite is missing, fail fast and report the explicit blocker.
```

---

## Follow-up Prompt: Phase 3 (State + Mock Orchestration)

```md
Read `CLAUDE.md` and implement **Phase 3 only**.

1. Create `app/stores/debate.ts` with:
   - state: `session`, `messages`, `versions`, `currentVersionIndex`, `isDebating`, `debateRound`, `pendingUserMessages`
   - getters: `currentVersion`, `messagesForDisplay`, `currentChangesSummary`
   - actions: `loadMockData`, `setCurrentVersion`, `addMessage`, `addVersion`, `sendUserMessage`, `consumePendingUserMessages`
2. Keep version numbering canonical and 0-based (first proposal is version `0`).
3. Implement `app/composables/useOrchestrator.ts` with simulated delays and sequence:
   - Flaneur proposal -> Completionist proposal -> Master merge -> Flaneur critique -> Completionist critique
4. Queue semantics:
   - user-input messages do not trigger immediate turn
   - consume **all** queued user messages in order on next agent turn, then clear queue
5. Wire session page to auto-start and update UI incrementally.
6. Keep mobile default tab as Itinerary.
7. Run quality gates (typecheck/lint/build where available) and report pass/fail.
```

---

## Follow-up Prompt: Phase 4 (Supabase)

```md
Read `CLAUDE.md` and implement **Phase 4 only**.

Before writing integration code, verify required Supabase env vars and connectivity.
If missing, fail fast with an explicit blocker.

1. Run `supabase/migrations/001_initial.sql`.
2. Implement server routes for session creation and loading.
3. Replace mock flows with Supabase reads/writes.
4. Add realtime subscriptions for `chat_messages` and `itinerary_versions`.
5. Keep append-only version history and 0-based version numbering.
6. Ensure version `0` persists with `changes_summary = null`.
7. Run quality gates (typecheck/lint/build where available) and report pass/fail.
```

---

## Follow-up Prompt: Phase 5 (LLM Integration)

```md
Read `CLAUDE.md` and implement **Phase 5 only**.

Before coding, verify Anthropic API key exists in runtime config.
If missing, fail fast with an explicit blocker.

1. Create `server/utils/llm.ts` and initialize Anthropic client from runtime config.
2. Implement `callAgent(systemPrompt, userMessage)` using a configurable model value (default to current project target model).
3. Implement `extractAndValidate`:
   - parse fenced ```json block first
   - fallback to parsing raw JSON if no fence is present
   - validate with Zod
4. Retry parse/schema failures up to 2 times.
5. On final failure, insert a chat message with:
   - `role: 'system'`
   - `agentId: 'master'`
   - content indicating the agent stumbled and needs a moment
6. Build `server/utils/agentPrompts.ts` with proposal/merge/critique builders.
7. Ensure critique prompts inject all queued user-input messages since the last agent turn.
8. Wire orchestrator to real API routes.
9. Run quality gates (typecheck/lint/build where available) and report pass/fail.
```
