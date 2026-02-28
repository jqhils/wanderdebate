# Project: WanderDebate — Multi-Agent Travel Itinerary Planner

## Overview

WanderDebate is a web application where adversarial AI "travel agents" debate and collaboratively build travel itineraries. Users specify a destination and trip duration, then watch two opinionated agents propose, critique, and refine a plan in real time. A neutral "Master" agent merges their proposals into a balanced itinerary.

The core UX is a split-panel layout: a live chat feed on the left showing the agent debate, and a versioned itinerary timeline on the right that updates as agents make changes.

---

## Tech Stack

| Layer         | Technology                                                                    |
| ------------- | ----------------------------------------------------------------------------- |
| Framework     | Nuxt 3 (Vue 3, `<script setup lang="ts">`)                                    |
| Styling       | Tailwind CSS 4 via `@nuxt/ui` v3 (uses Reka UI primitives under the hood)     |
| UI Components | `@nuxt/ui` v3 — use `<U*>` components (UButton, UCard, UInput, etc.)          |
| State         | Pinia (`@pinia/nuxt`)                                                         |
| Utilities     | `@vueuse/nuxt` for composable reactivity helpers                              |
| Animation     | `@formkit/auto-animate` for chat message entry/exit                           |
| Markdown      | `markdown-it` + `isomorphic-dompurify` for sanitized chat markdown rendering  |
| Validation    | Zod for runtime schema validation of LLM responses                            |
| Backend       | Supabase (Postgres, Auth, Realtime subscriptions) via `@nuxtjs/supabase`      |
| Icons         | `@nuxt/icon` with Lucide icon set (`i-lucide-*`)                              |
| AI            | Anthropic SDK (`@anthropic-ai/sdk`) — server-side only via Nuxt server routes |

## Package Manager

Use **pnpm**. Lock file is `pnpm-lock.yaml`.

---

## Project Structure

```
wanderdebate/
├── CLAUDE.md                    # This file
├── nuxt.config.ts
├── app.config.ts                # Nuxt UI theme tokens
├── tailwind.config.ts
├── .env                         # Local secrets (never committed)
├── .env.example                 # Template for required env vars
│
├── app/
│   ├── app.vue                  # Root layout shell
│   ├── pages/
│   │   ├── index.vue            # Landing / session setup
│   │   └── session/
│   │       └── [id].vue         # Main debate view (chat + itinerary)
│   │
│   ├── components/
│   │   ├── setup/               # Trip setup form components
│   │   │   └── TripForm.vue
│   │   ├── chat/                # Chat panel components
│   │   │   ├── ChatPanel.vue
│   │   │   ├── ChatMessage.vue
│   │   │   ├── ChatInput.vue        # Text input + SEND for user messages
│   │   │   └── AgentAvatar.vue
│   │   ├── itinerary/           # Itinerary panel components
│   │   │   ├── ItineraryPanel.vue
│   │   │   ├── ItineraryTimeline.vue
│   │   │   ├── ActivityCard.vue
│   │   │   ├── ReasoningToggle.vue  # Expandable agentLogic per activity
│   │   │   ├── ChangesSummary.vue   # Dropped/Added diff at bottom
│   │   │   └── VersionSelector.vue
│   │   └── shared/              # Reusable UI primitives
│   │
│   ├── composables/
│   │   ├── useOrchestrator.ts   # Turn-based agent flow control
│   │   ├── useSession.ts        # Session CRUD & Supabase realtime
│   │   └── useAgents.ts         # Agent config registry
│   │
│   ├── stores/
│   │   └── debate.ts            # Pinia store: session, messages, versions
│   │
│   └── utils/
│       ├── schemas.ts           # Zod schemas + TS types (source of truth)
│       └── prompts.ts           # Agent system prompts & merge prompt
│
├── server/
│   ├── api/
│   │   ├── sessions/
│   │   │   ├── index.post.ts    # Create session
│   │   │   └── [id].get.ts      # Load session + versions
│   │   └── debate/
│   │       ├── propose.post.ts  # Single agent proposal
│   │       ├── merge.post.ts    # Master merge step
│   │       ├── critique.post.ts # Agent critique turn
│   │       └── user-input.post.ts # Store user message + queue for next turn
│   └── utils/
│       ├── llm.ts               # Anthropic client wrapper
│       ├── agentPrompts.ts      # Server-side prompt construction
│       └── supabase.ts          # Server Supabase client
│
├── shared/
│   └── types/                   # Types shared between app/ and server/
│       └── index.ts             # Re-exports from schemas.ts
│
└── supabase/
    └── migrations/
        └── 001_initial.sql      # DDL for sessions, versions, messages
```

---

## UI Wireframe Reference

The UI is informed by a hand-drawn wireframe (see `Note_28_Feb_2026.pdf`). Key design decisions from it:

### Setup Screen

- Header: "Traveling Where?"
- Location text input with search icon
- Duration dropdown: 24H, 48H, 72H options (include custom option expressed in number of days)
- Agent selector: pill-shaped toggles labeled "Slow" and "Fast" with agent icons beneath
- Prominent action button to start planning

### Session Screen (Desktop: side-by-side / Mobile: tabbed)

**Left Panel — Chat**

- Alternating message bubbles: agent avatar on the left or right depending on which agent is speaking
- Each message is a speech bubble with the agent's commentary
- **User can type and SEND messages** to influence the debate (e.g. "I really want to visit the Marais" or "Skip museums, I've been before"). User messages are injected into the next agent's context as constraints.
- SEND button at bottom of chat input

**Right Panel — Itinerary**

- **Version selector**: Horizontal row of small dot/pill indicators with `←` `→` arrow buttons for navigation. Each dot represents a version; the active one is highlighted. Agent avatar/color shown on each dot.
- **Timeline**: Vertical dashed-line timeline with location pin icons. Each entry shows:
  - Time (e.g. "9AM", "11am", "1pm", "3pm")
  - Title (e.g. "Eiffel Tower", "Coffee @ Louvre")
  - Description text (2-3 lines)
  - **Agent origin indicator**: Small colored dot or agent icon showing who proposed this activity
  - **Reasoning toggle**: A small expand/collapse icon (yellow checkmark in wireframe) on the right side of each activity. Tapping it reveals the `agentLogic` — the agent's reasoning for why this activity is here.
- **Changes Summary** (bottom of itinerary panel): When viewing any version after the first, show a compact diff summary:
  - **Dropped**: Activities removed from the previous version (with strikethrough styling)
  - **Added**: Activities added in this version (with highlight styling)
  - This is a core feature, not optional. It lets the user quickly see what each agent changed without comparing full timelines.

### Mobile Behavior

- The detailed itinerary view (with reasoning, changes summary) is the primary mobile view
- Mobile tab default is **Itinerary**
- Chat and Itinerary switch via tabs
- The compact itinerary shown in the wireframe center may serve as a "preview" on desktop when the itinerary panel is collapsed

---

## TypeScript Interfaces (Source of Truth)

All types are defined alongside their Zod schemas in `app/utils/schemas.ts`. Use `z.infer<>` to derive types. **Never define types separately from schemas.**

```typescript
import { z } from "zod";

// --- Agent identity ---
export const AgentId = z.enum(["flaneur", "completionist", "master"]);
export type AgentId = z.infer<typeof AgentId>;

// --- Single activity within a day ---
export const ActivitySchema = z.object({
  id: z.string().uuid(),
  timeBlock: z.string(), // e.g. "08:00–11:00"
  title: z.string(),
  description: z.string(),
  location: z.string(),
  coordinates: z
    .object({
      // For future map integration
      lat: z.number(),
      lng: z.number(),
    })
    .optional(),
  durationMinutes: z.number().int().positive(),
  category: z.enum([
    "landmark",
    "food",
    "culture",
    "nature",
    "nightlife",
    "transit",
    "free-roam",
  ]),
  agentOrigin: AgentId, // Which agent proposed this
  agentLogic: z.string(), // Why this activity was chosen
});
export type Activity = z.infer<typeof ActivitySchema>;

// --- A single day's plan ---
export const DayPlanSchema = z.object({
  dayNumber: z.number().int().positive(),
  theme: z.string().optional(), // e.g. "Temple Hopping & Drift"
  activities: z.array(ActivitySchema),
});
export type DayPlan = z.infer<typeof DayPlanSchema>;

// --- Changes diff between versions ---
export const ChangesSummarySchema = z.object({
  dropped: z.array(
    z.object({
      title: z.string(),
      timeBlock: z.string(),
    })
  ),
  added: z.array(
    z.object({
      title: z.string(),
      timeBlock: z.string(),
      agentOrigin: AgentId,
    })
  ),
});
export type ChangesSummary = z.infer<typeof ChangesSummarySchema>;

// --- A complete itinerary snapshot (one version) ---
export const ItineraryVersionSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  versionNumber: z.number().int().nonnegative(),
  agentId: AgentId,
  commentary: z.string(), // Agent's justification for this version
  days: z.array(DayPlanSchema),
  changesSummary: z.union([ChangesSummarySchema, z.null()]), // Explicit null for version 0
  createdAt: z.string().datetime(),
});
export type ItineraryVersion = z.infer<typeof ItineraryVersionSchema>;

// --- Chat message ---
export const ChatMessageSchema = z.object({
  id: z.string().uuid(),
  sessionId: z.string().uuid(),
  agentId: z.union([AgentId, z.literal("user")]), // 'user' for human messages; system role uses 'master'
  role: z.enum(["proposal", "critique", "merge", "system", "user-input"]),
  content: z.string(), // Markdown-formatted commentary
  relatedVersionId: z.string().uuid().optional(),
  createdAt: z.string().datetime(),
});
export type ChatMessage = z.infer<typeof ChatMessageSchema>;

// --- Session ---
export const SessionSchema = z.object({
  id: z.string().uuid(),
  destination: z.string(),
  durationHours: z.number().positive(),
  agents: z.array(AgentId),
  status: z.enum(["setup", "debating", "paused", "complete"]),
  createdAt: z.string().datetime(),
});
export type Session = z.infer<typeof SessionSchema>;
```

---

## Supabase Schema

```sql
-- 001_initial.sql

create table sessions (
  id uuid primary key default gen_random_uuid(),
  destination text not null,
  duration_hours numeric not null,
  agents text[] not null default '{"flaneur","completionist"}',
  status text not null default 'setup'
    check (status in ('setup', 'debating', 'paused', 'complete')),
  created_at timestamptz not null default now()
);

create table itinerary_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  version_number int not null,
  agent_id text not null,
  commentary text not null default '',
  days jsonb not null default '[]',
  changes_summary jsonb default null,   -- {dropped: [...], added: [...]} computed vs previous version
  created_at timestamptz not null default now(),
  unique (session_id, version_number)
);

create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references sessions(id) on delete cascade,
  agent_id text not null,
  role text not null check (role in ('proposal', 'critique', 'merge', 'system', 'user-input')),
  content text not null,
  related_version_id uuid references itinerary_versions(id),
  created_at timestamptz not null default now()
);

-- Index for loading a session's history
create index idx_versions_session on itinerary_versions(session_id, version_number);
create index idx_messages_session on chat_messages(session_id, created_at);

-- Enable realtime for live debate watching
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table itinerary_versions;
```

---

## Orchestration Flow

The `useOrchestrator` composable drives the debate. The sequence is:

```
1. User hits PLAN
2. POST /api/sessions          → create session row
3. POST /api/debate/propose    → Agent A (Flâneur) proposes   → version 0 + chat msg
4. POST /api/debate/propose    → Agent B (Completionist)      → version 1 + chat msg
5. POST /api/debate/merge      → Master merges v0 + v1        → version 2 + chat msg
6. POST /api/debate/critique   → Agent A critiques v2         → version 3 + chat msg
7. POST /api/debate/critique   → Agent B critiques v3         → version 4 + chat msg
   — HARD STOP (unless user clicks "Continue Debate") —
8. Optional: repeat step 6-7 for additional rounds
```

### User Messages

The user can type messages into the chat at any time. These are:

- Stored as `role: 'user-input'` with `agentId: 'user'`
- Injected into the **next** agent's prompt as additional constraints (e.g. "The user has said: 'I want to avoid museums'")
- They do NOT trigger an immediate agent response — they queue up and are consumed on the next scheduled agent turn
- All queued user messages since the last agent turn are consumed in order, then cleared
- If the debate is paused (hard stop), user messages are consumed when "Continue Debate" is clicked

Each API route:

- Receives the session ID and any prior version context
- Constructs the appropriate system prompt + conversation context
- Calls the Anthropic API with structured output instructions
- Validates the response with Zod
- Writes the new version + chat message to Supabase
- Returns the validated data to the client

### LLM Response Parsing

Every agent response MUST be parsed against the Zod schema. The prompt contract asks the LLM to return JSON inside a ```json code fence. Server parsing should prefer fenced JSON and fall back to raw JSON when no fence is present:

````typescript
// server/utils/llm.ts
function extractAndValidate<T>(raw: string, schema: z.ZodType<T>): T {
  const fenceMatch = raw.match(/```json\s*([\s\S]*?)\s*```/i);
  const candidate = fenceMatch ? fenceMatch[1] : raw.trim();
  const parsed = JSON.parse(candidate);
  return schema.parse(parsed); // throws ZodError on mismatch
}
````

Retry up to 2 times on parse or schema validation failure before surfacing an error to the client.

---

## Coding Standards

### General

- When instructions conflict, prefer executable correctness and document any interpreted fix
- All components use `<script setup lang="ts">` with no Options API
- Strict TypeScript: enable `strict: true` in tsconfig
- Use `defineProps<>()` and `defineEmits<>()` generic syntax
- Prefer `const` over `let`; never use `var`
- Use template refs with `useTemplateRef()` (Vue 3.5+), not `ref(null)`

### Styling

- Tailwind CSS exclusively — no `<style>` blocks except when absolutely necessary for deep selector overrides
- Use Nuxt UI's `app.config.ts` for theme customization (colors, component variants)
- Responsive: mobile-first. The chat/itinerary split stacks vertically on `< lg` breakpoints
- Chat markdown rendering must sanitize HTML strictly (no unsafe HTML/script execution)

### State Management

- Pinia store in `app/stores/debate.ts` holds: `session`, `messages[]`, `versions[]`, `currentVersionIndex`, `isDebating`
- Use Supabase Realtime subscriptions in `useSession` to reactively push new messages/versions into the store
- Never mutate store state outside of Pinia actions

### API Routes

- Server routes in `server/api/` use `defineEventHandler`
- Validate all incoming request bodies with Zod (`readValidatedBody`)
- Return typed responses; throw `createError()` for HTTP errors
- The Anthropic API key lives in `NUXT_ANTHROPIC_API_KEY` (runtime config, server-only)

### Error Handling

- Server: try/catch around LLM calls; return structured error JSON with `statusCode` and `message`
- Client: `useAsyncData` / `$fetch` with error handling; show `UNotification` toast on failure
- LLM parse/schema failures: retry twice, then return a system chat message saying the agent "stumbled" with `role: 'system'` and `agentId: 'master'`

---

## Environment Variables

```bash
# .env.example
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key                     # Public anon key for client
SUPABASE_SERVICE_ROLE_KEY=your-service-key      # Server-only, for admin ops
NUXT_ANTHROPIC_API_KEY=sk-ant-...               # Server-only
```

Access via `useRuntimeConfig()`:

```typescript
// nuxt.config.ts
runtimeConfig: {
  anthropicApiKey: '',          // Server-only (from NUXT_ANTHROPIC_API_KEY)
  public: {
    supabaseUrl: '',
    supabaseKey: '',
  }
}
```

---

## Build Phases

Follow this order. Complete each phase before moving to the next.

### Phase 1: Scaffolding

- `npx nuxi init wanderdebate`
- Install all dependencies
- Configure `nuxt.config.ts` with all modules
- Set up `app.config.ts` with theme colors
- Create the Zod schemas in `app/utils/schemas.ts`
- Create the Supabase migration file
- Wire up `.env.example`
- Run quality gates before moving on: typecheck, lint, build (if scripts exist)

### Phase 2: Layout & Static UI

- Build the setup page (`pages/index.vue`) with destination, duration, agent selector, PLAN button
- Build the session page (`pages/session/[id].vue`) with the split-panel layout
- Build all chat and itinerary sub-components with **hardcoded mock data**
- Include duration presets (24H/48H/72H) and a custom day-count option
- Ensure responsive behavior (stacked on mobile, split on desktop)
- Add `@formkit/auto-animate` to the chat message list
- Keep Phase 2 free of Supabase and orchestration logic (UI/static data only)
- Default mobile session tab to Itinerary
- Run quality gates before moving on: typecheck, lint, build (if scripts exist)

### Phase 3: State & Mock Orchestration

- Create the Pinia `debate` store
- Create `useOrchestrator` composable with the full turn sequence using **mock delays and fixture data**
- Wire components to the store so the UI reacts to mock data flowing through
- Implement version selector in the itinerary panel
- Keep canonical version numbering 0-based in store and orchestration flow
- Consume all queued user messages in order on next agent turn, then clear queue
- Run quality gates before moving on: typecheck, lint, build (if scripts exist)

### Phase 4: Supabase Integration

- Set up Supabase tables (run migration)
- Replace mock data with real Supabase reads/writes
- Add Realtime subscriptions for `chat_messages` and `itinerary_versions`
- Create session via POST route, redirect to `/session/[id]`
- Fail fast with explicit blocker if required Supabase env vars or connectivity are missing
- Run quality gates before moving on: typecheck, lint, build (if scripts exist)

### Phase 5: LLM Integration

- Create `server/utils/llm.ts` Anthropic client wrapper
- Build `server/utils/agentPrompts.ts` with system prompts for each agent
- Implement the three debate API routes (`propose`, `merge`, `critique`)
- Add Zod validation of LLM responses with retry logic (fenced JSON first, raw JSON fallback)
- Connect `useOrchestrator` to real API routes
- Fail fast with explicit blocker if Anthropic key is missing
- Run quality gates before moving on: typecheck, lint, build (if scripts exist)

### Phase 6: Polish

- Loading states (skeleton UI during agent "thinking")
- Error toasts
- Agent avatars and color coding
- Diff highlights between itinerary versions (optional)
- Mobile UX refinements

### Verification Checklist

- **Schema load test:** importing `app/utils/schemas.ts` succeeds with no runtime reference errors
- **Nullability test:** version `0` accepts `changesSummary: null`; later versions carry valid dropped/added diffs
- **Phase discipline test:** Phase 2 outputs contain no Supabase calls and no orchestration logic
- **Mobile behavior test:** session view defaults to Itinerary tab on mobile; tab switching works
- **Queue semantics test:** multiple queued `user-input` messages are all consumed in-order on next agent turn, then cleared
- **Parser resilience test:** `extractAndValidate` accepts fenced JSON first, then raw JSON fallback, and retries exactly 2 times on failures
- **Quality gate test:** each phase reports typecheck/lint/build outcomes (where scripts exist)

---

## Agent System Prompts

Store in `app/utils/prompts.ts` (imported by server routes). See the companion `FLANEUR_PERSONALITY.md` and `COMPLETIONIST_PERSONALITY.md` files for full persona definitions.

The **Master Merge** prompt:

```
You are the Neutral Arbitrator. You receive two proposed itineraries for the same trip: one from a slow-travel advocate (The Flâneur) and one from an efficiency-focused planner (The Completionist).

Your job is to produce a single merged itinerary that:
- Gives mornings (before 1 PM) to the Completionist's high-priority landmarks
- Gives afternoons (1 PM – 6 PM) to the Flâneur's unstructured exploration
- Negotiates evenings based on the strongest dining/experience option from either agent
- Preserves the "agentOrigin" field accurately so the user can see whose idea each activity was
- Balances roughly 50/50 in activity count between agents

You must respond with ONLY a JSON code block matching the ItineraryVersion schema.
```

---

## Key Design Decisions

1. **Version history is append-only.** Never mutate a previous version. Each agent turn creates a new row in `itinerary_versions`.

2. **The chat IS the audit trail.** Every version has a corresponding chat message with the agent's reasoning. The `related_version_id` links them.

3. **Structured Drift method.** Mornings are structured (Completionist), afternoons are open (Flâneur). This is enforced in the Master merge prompt, not in code.

4. **Hard stop after 2 critique rounds.** The orchestrator stops automatically. A "Continue Debate" button lets users opt in to more rounds. This prevents runaway API costs.

5. **Server-side LLM only.** No API keys on the client. All LLM calls go through Nuxt server routes.

6. **Changes Summary is computed per version.** When a new version is created, the server computes the diff against the previous version (dropped/added activities by title + time) and stores it in `changes_summary`. Version `0` stores `changesSummary: null`. The itinerary panel renders this at the bottom of each version view.

7. **Per-activity reasoning is always stored, shown on demand.** Every activity has an `agentLogic` field. The UI shows a small toggle icon on each activity card; tapping it expands a reasoning tooltip/panel. This lets users understand _why_ each item is there without cluttering the default view.

8. **Users can influence the debate.** The chat input isn't just for watching — users can type constraints, preferences, or vetoes. These are queued and injected into the next agent's context. This makes the tool feel collaborative rather than passive.

9. **Version navigation uses dot indicators.** A horizontal row of small circles (colored by agent) with `←` `→` arrows. This is more spatial and scannable than a dropdown, and matches the "chronological progression" mental model.
10. **Version numbering is canonical and 0-based.** First proposal is version `0` across DB, store, and orchestration.
11. **System messages are attributed to Master.** Any `role: 'system'` chat message uses `agentId: 'master'`.
