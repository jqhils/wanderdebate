<script setup lang="ts">
import type { Session } from '~/utils/schemas'
import { useSession } from '~/composables/useSession'
import splashArt from '~/assets/images/hero/agents-splash.png'
import flaneurImg from '~/assets/images/agents/flaneur.png'
import completionistImg from '~/assets/images/agents/completionist.png'

definePageMeta({
  layout: false,
})

const user = useSupabaseUser()
const supabase = useSupabaseClient()
const toast = useToast()
const { listSessions, loading, error } = useSession()

const email = ref('')
const password = ref('')
const authMode = ref<'signin' | 'signup'>('signin')
const authLoading = ref(false)
const sessions = ref<Session[]>([])
const hydrated = ref(false)

const sessionsLoading = computed(() =>
  hydrated.value ? loading.value : false,
)

const userDisplayName = computed(() => {
  const raw = user.value?.email?.split('@')[0] ?? 'traveler'
  return raw.charAt(0).toUpperCase() + raw.slice(1)
})

function formatDate(input: string): string {
  return new Date(input).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function refreshSessions() {
  if (!user.value) {
    sessions.value = []
    return
  }

  const result = await listSessions()
  if (result) {
    sessions.value = result
    return
  }

  toast.add({
    title: 'Failed to load itineraries',
    description: error.value ?? 'Please retry in a moment.',
    color: 'error',
  })
}

async function handleAuth() {
  if (!email.value.trim() || !password.value.trim()) {
    toast.add({
      title: 'Email and password required',
      color: 'warning',
    })
    return
  }

  authLoading.value = true
  try {
    if (authMode.value === 'signup') {
      const { error: signUpError, data } = await supabase.auth.signUp({
        email: email.value.trim(),
        password: password.value,
      })

      if (signUpError) {
        throw signUpError
      }

      toast.add({
        title: data.session ? 'Account created' : 'Check your email to confirm signup',
        color: 'success',
      })
    }
    else {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: email.value.trim(),
        password: password.value,
      })

      if (signInError) {
        throw signInError
      }

      toast.add({
        title: 'Signed in',
        color: 'success',
      })
    }

    await refreshSessions()
  }
  catch (err) {
    toast.add({
      title: authMode.value === 'signup' ? 'Sign up failed' : 'Sign in failed',
      description: err instanceof Error ? err.message : 'Authentication error',
      color: 'error',
    })
  }
  finally {
    authLoading.value = false
  }
}

async function handleSignOut() {
  const { error: signOutError } = await supabase.auth.signOut()
  if (signOutError) {
    toast.add({
      title: 'Sign out failed',
      description: signOutError.message,
      color: 'error',
    })
    return
  }

  sessions.value = []
  toast.add({
    title: 'Signed out',
    color: 'info',
  })
}

function scrollToAction() {
  document.getElementById('action-section')?.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => {
  hydrated.value = true
  void refreshSessions()
})

watch(() => user.value?.id, () => {
  if (!hydrated.value) return
  void refreshSessions()
})
</script>

<template>
  <div class="lp">
    <!-- ===== NAV ===== -->
    <nav class="lp-nav">
      <div class="lp-nav__inner">
        <div class="flex items-center gap-2.5">
          <div class="lp-nav__logo" aria-hidden="true">W</div>
          <span class="lp-nav__wordmark">WanderDebate</span>
        </div>

        <div class="flex items-center gap-3">
          <template v-if="user">
            <span class="hidden text-sm text-slate-400 sm:inline">{{ userDisplayName }}</span>
            <button class="lp-nav__link" @click="handleSignOut">Sign Out</button>
          </template>
          <template v-else>
            <button class="lp-nav__link" @click="scrollToAction">Sign In</button>
          </template>
        </div>
      </div>
    </nav>

    <!-- ===== HERO ===== -->
    <section class="lp-hero">
      <div class="lp-hero__bg" aria-hidden="true" />

      <div class="lp-hero__content">
        <div class="lp-hero__text">
          <p class="lp-hero__tag">Adversarial itinerary planning</p>

          <h1 class="lp-hero__h1">
            Two agents argue.<br>
            <span class="lp-hero__h1--accent">You get the better trip.</span>
          </h1>

          <p class="lp-hero__sub">
            Pick a destination. Watch a slow-travel romantic and a hyper-efficient planner
            clash over every hour of your day. Keep the version you like best.
          </p>

          <div class="lp-hero__actions">
            <button class="lp-btn lp-btn--primary" @click="scrollToAction">
              <UIcon name="i-lucide-plane-takeoff" class="size-4" />
              Start Planning
            </button>
            <a href="#how-it-works" class="lp-btn lp-btn--ghost">
              How it works
              <UIcon name="i-lucide-arrow-down" class="size-3.5" />
            </a>
          </div>
        </div>

        <div class="lp-hero__visual">
          <img
            :src="splashArt"
            alt="The Flaneur and The Completionist debating a travel itinerary"
            class="lp-hero__splash"
          >
        </div>
      </div>
    </section>

    <!-- ===== AGENTS ===== -->
    <section class="lp-agents">
      <div class="lp-section-inner">
        <p class="lp-section__label">Meet your planners</p>
        <h2 class="lp-section__title">Different philosophies.<br class="hidden sm:block"> Same trip.</h2>

        <div class="lp-agents__grid">
          <!-- Flaneur -->
          <div class="lp-agent lp-agent--flaneur">
            <div class="lp-agent__img-wrap">
              <img :src="flaneurImg" alt="The Flaneur" class="lp-agent__img">
            </div>
            <div class="lp-agent__body">
              <div class="lp-agent__name-row">
                <h3 class="lp-agent__name">The Flaneur</h3>
                <span class="lp-agent__badge lp-agent__badge--flaneur">Slow travel</span>
              </div>
              <p class="lp-agent__philosophy">
                "Leave room for the street that catches your eye. The best meals are never on the list."
              </p>
              <ul class="lp-agent__traits">
                <li>Prioritizes atmosphere over checkboxes</li>
                <li>Blocks long stretches for wandering</li>
                <li>Favours local haunts over tourist staples</li>
              </ul>
            </div>
          </div>

          <!-- VS divider -->
          <div class="lp-agents__vs" aria-hidden="true">
            <span>VS</span>
          </div>

          <!-- Completionist -->
          <div class="lp-agent lp-agent--completionist">
            <div class="lp-agent__img-wrap">
              <img :src="completionistImg" alt="The Completionist" class="lp-agent__img">
            </div>
            <div class="lp-agent__body">
              <div class="lp-agent__name-row">
                <h3 class="lp-agent__name">The Completionist</h3>
                <span class="lp-agent__badge lp-agent__badge--completionist">Max efficiency</span>
              </div>
              <p class="lp-agent__philosophy">
                "Every hour has a purpose. If you're walking past a landmark, you're stopping."
              </p>
              <ul class="lp-agent__traits">
                <li>Packs every slot with high-signal stops</li>
                <li>Optimises routes for proximity</li>
                <li>Never leaves a top-5 sight off the list</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== HOW IT WORKS ===== -->
    <section id="how-it-works" class="lp-how">
      <div class="lp-section-inner">
        <p class="lp-section__label">The process</p>
        <h2 class="lp-section__title">Three rounds.<br class="hidden sm:block"> One itinerary.</h2>

        <div class="lp-how__steps">
          <div class="lp-how__step">
            <div class="lp-how__num">1</div>
            <h3 class="lp-how__step-title">Set the stage</h3>
            <p class="lp-how__step-body">
              Enter a destination, pick your trip length, and choose which model
              powers the debate. Hit plan.
            </p>
          </div>

          <div class="lp-how__connector" aria-hidden="true" />

          <div class="lp-how__step">
            <div class="lp-how__num">2</div>
            <h3 class="lp-how__step-title">Watch them clash</h3>
            <p class="lp-how__step-body">
              Each agent proposes, critiques, and refines. A neutral arbitrator merges
              their best ideas. You can inject your own preferences mid-debate.
            </p>
          </div>

          <div class="lp-how__connector" aria-hidden="true" />

          <div class="lp-how__step">
            <div class="lp-how__num">3</div>
            <h3 class="lp-how__step-title">Pick your winner</h3>
            <p class="lp-how__step-body">
              Scrub through every version, see what changed, read each agent's
              reasoning, and lock in the itinerary that fits your style.
            </p>
          </div>
        </div>
      </div>
    </section>

    <!-- ===== ACTION SECTION ===== -->
    <section id="action-section" class="lp-action">
      <div class="lp-section-inner">
        <!-- NOT LOGGED IN: Auth form -->
        <template v-if="!user">
          <div class="lp-auth">
            <div class="lp-auth__left">
              <h2 class="lp-auth__title">Sign in to start debating</h2>
              <p class="lp-auth__desc">
                Your sessions persist. Your debates stay linked. Every version stays revisitable.
              </p>

              <ul class="lp-auth__perks">
                <li>
                  <UIcon name="i-lucide-save" class="size-4 shrink-0 text-teal-400" />
                  Saved itineraries across sessions
                </li>
                <li>
                  <UIcon name="i-lucide-git-compare-arrows" class="size-4 shrink-0 text-teal-400" />
                  Version-by-version diffs
                </li>
                <li>
                  <UIcon name="i-lucide-message-circle" class="size-4 shrink-0 text-teal-400" />
                  Inject your preferences mid-debate
                </li>
              </ul>
            </div>

            <div class="lp-auth__form">
              <h3 class="lp-auth__form-title">
                {{ authMode === 'signup' ? 'Create an account' : 'Welcome back' }}
              </h3>

              <div class="mt-4 space-y-3">
                <UInput
                  v-model="email"
                  type="email"
                  icon="i-lucide-mail"
                  size="lg"
                  placeholder="you@example.com"
                />
                <UInput
                  v-model="password"
                  type="password"
                  icon="i-lucide-lock"
                  size="lg"
                  placeholder="Password"
                />
              </div>

              <div class="mt-4 space-y-2">
                <button
                  class="lp-btn lp-btn--primary w-full justify-center"
                  :disabled="authLoading"
                  @click="handleAuth"
                >
                  <UIcon v-if="authLoading" name="i-lucide-loader-2" class="size-4 animate-spin" />
                  <UIcon v-else name="i-lucide-arrow-right" class="size-4" />
                  {{ authMode === 'signup' ? 'Create Account' : 'Sign In' }}
                </button>

                <button
                  class="w-full text-center text-sm text-slate-400 transition-colors hover:text-white"
                  @click="authMode = authMode === 'signup' ? 'signin' : 'signup'"
                >
                  {{ authMode === 'signup' ? 'Already have an account? Sign in' : 'Need an account? Sign up' }}
                </button>
              </div>
            </div>
          </div>
        </template>

        <!-- LOGGED IN: Trip form + sessions -->
        <template v-else>
          <div class="lp-dash">
            <div class="lp-dash__header">
              <div>
                <h2 class="lp-dash__greeting">Hey, {{ userDisplayName }}</h2>
                <p class="text-sm text-slate-400">Start a new debate or continue a previous one.</p>
              </div>
            </div>

            <div class="lp-dash__grid">
              <SetupTripForm />

              <div class="lp-dash__card">
                <div class="flex items-center justify-between mb-4">
                  <h3 class="text-lg font-semibold text-slate-100">Your itineraries</h3>
                  <button
                    class="lp-btn-icon"
                    :disabled="sessionsLoading"
                    @click="refreshSessions"
                  >
                    <UIcon
                      name="i-lucide-refresh-cw"
                      :class="['size-4', sessionsLoading && 'animate-spin']"
                    />
                  </button>
                </div>

                <div v-if="sessions.length === 0" class="lp-dash__empty">
                  <UIcon name="i-lucide-map-pin-off" class="size-8 text-slate-600" />
                  <p>No itineraries yet. Start your first debate.</p>
                </div>

                <div v-else class="space-y-2.5">
                  <NuxtLink
                    v-for="session in sessions"
                    :key="session.id"
                    :to="`/session/${session.id}`"
                    class="lp-session"
                  >
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-medium text-slate-100">
                        {{ session.destination }}
                      </p>
                      <p class="text-xs text-slate-500 mt-0.5">
                        {{ session.durationHours }}h &middot; {{ formatDate(session.createdAt) }}
                      </p>
                    </div>
                    <div class="flex items-center gap-2">
                      <span
                        :class="[
                          'text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full',
                          session.status === 'complete'
                            ? 'bg-emerald-500/15 text-emerald-400'
                            : 'bg-slate-700/50 text-slate-400',
                        ]"
                      >
                        {{ session.status }}
                      </span>
                      <UIcon name="i-lucide-chevron-right" class="size-4 text-slate-600" />
                    </div>
                  </NuxtLink>
                </div>
              </div>
            </div>
          </div>
        </template>
      </div>
    </section>

    <!-- ===== FOOTER ===== -->
    <footer class="lp-footer">
      <p>Built for the Mistral AI Hackathon &middot; 2026</p>
    </footer>
  </div>
</template>

<style scoped>
/* ──────────────────────────────────────────────
   FOUNDATION
   ────────────────────────────────────────────── */
.lp {
  --ink: var(--wd-ink);
  --ink-2: var(--wd-ink-2);
  --ink-3: var(--wd-ink-3);
  --surface: var(--wd-surface);
  --surface-raised: var(--wd-surface-raised);
  --surface-card: var(--wd-surface-card);
  --border: var(--wd-border);
  --teal: var(--wd-teal);
  --amber: var(--wd-amber);
  --teal-dim: rgba(45, 212, 191, 0.12);
  --amber-dim: rgba(245, 158, 11, 0.12);

  min-height: 100vh;
  background: var(--surface);
  color: var(--ink);
  font-family: 'Inter', 'Segoe UI', system-ui, -apple-system, sans-serif;
  -webkit-font-smoothing: antialiased;
}

/* ──────────────────────────────────────────────
   NAV
   ────────────────────────────────────────────── */
.lp-nav {
  position: sticky;
  top: 0;
  z-index: 50;
  border-bottom: 1px solid var(--border);
  background: rgba(12, 12, 14, 0.82);
  backdrop-filter: blur(14px) saturate(1.2);
}

.lp-nav__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.75rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.lp-nav__logo {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, var(--teal), var(--amber));
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 0.8rem;
  color: #0c0c0e;
  line-height: 1;
}

.lp-nav__wordmark {
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: -0.02em;
}

.lp-nav__link {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--ink-2);
  transition: color 0.15s;
  cursor: pointer;
  background: none;
  border: none;
}

.lp-nav__link:hover {
  color: var(--ink);
}

/* ──────────────────────────────────────────────
   HERO
   ────────────────────────────────────────────── */
.lp-hero {
  position: relative;
  overflow: hidden;
  padding: 5rem 1.25rem 4rem;
}

.lp-hero__bg {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(ellipse 60% 50% at 15% 20%, var(--teal-dim), transparent),
    radial-gradient(ellipse 50% 40% at 85% 60%, var(--amber-dim), transparent);
  pointer-events: none;
}

.lp-hero__content {
  position: relative;
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 3rem;
  align-items: center;
}

@media (min-width: 900px) {
  .lp-hero__content {
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
  }
  .lp-hero {
    padding: 6rem 2rem 5rem;
  }
}

.lp-hero__tag {
  display: inline-block;
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: var(--teal);
  border: 1px solid rgba(45, 212, 191, 0.3);
  border-radius: 999px;
  padding: 0.3rem 0.85rem;
  margin-bottom: 1.25rem;
}

.lp-hero__h1 {
  font-size: clamp(2.2rem, 5.5vw, 3.8rem);
  font-weight: 800;
  line-height: 1.05;
  letter-spacing: -0.03em;
  color: var(--ink);
}

.lp-hero__h1--accent {
  background: linear-gradient(90deg, var(--teal), var(--amber));
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}

.lp-hero__sub {
  margin-top: 1.5rem;
  font-size: clamp(1rem, 1.3vw, 1.12rem);
  line-height: 1.65;
  color: var(--ink-2);
  max-width: 48ch;
}

.lp-hero__actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 2rem;
  flex-wrap: wrap;
}

.lp-hero__visual {
  display: flex;
  justify-content: center;
}

.lp-hero__splash {
  width: 100%;
  max-width: 600px;
  height: auto;
}

/* ──────────────────────────────────────────────
   SHARED SECTION
   ────────────────────────────────────────────── */
.lp-section-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.25rem;
}

@media (min-width: 640px) {
  .lp-section-inner {
    padding: 0 2rem;
  }
}

.lp-section__label {
  font-size: 0.7rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.13em;
  color: var(--teal);
  margin-bottom: 0.6rem;
}

.lp-section__title {
  font-size: clamp(1.6rem, 3.5vw, 2.4rem);
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: var(--ink);
  margin-bottom: 2.5rem;
}

/* ──────────────────────────────────────────────
   AGENTS
   ────────────────────────────────────────────── */
.lp-agents {
  padding: 5rem 0;
  border-top: 1px solid var(--border);
  background: var(--surface-raised);
}

.lp-agents__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
  align-items: stretch;
}

@media (min-width: 800px) {
  .lp-agents__grid {
    grid-template-columns: 1fr auto 1fr;
    gap: 2rem;
  }
}

.lp-agent {
  border: 1px solid var(--border);
  border-radius: 1.1rem;
  background: var(--surface-card);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.lp-agent__img-wrap {
  display: flex;
  justify-content: center;
  padding: 2rem 1.5rem 0;
}

.lp-agent__img {
  width: 180px;
  height: 180px;
  object-fit: contain;
  filter: drop-shadow(0 8px 24px rgba(0, 0, 0, 0.4));
}

@media (min-width: 800px) {
  .lp-agent__img {
    width: 200px;
    height: 200px;
  }
}

.lp-agent__body {
  padding: 1.5rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.lp-agent__name-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
}

.lp-agent__name {
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
}

.lp-agent__badge {
  font-size: 0.62rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  padding: 0.22rem 0.55rem;
  border-radius: 999px;
}

.lp-agent__badge--flaneur {
  background: var(--teal-dim);
  color: var(--teal);
  border: 1px solid rgba(45, 212, 191, 0.25);
}

.lp-agent__badge--completionist {
  background: var(--amber-dim);
  color: var(--amber);
  border: 1px solid rgba(245, 158, 11, 0.25);
}

.lp-agent__philosophy {
  font-style: italic;
  color: var(--ink-2);
  font-size: 0.9rem;
  line-height: 1.55;
  margin-bottom: 1rem;
  border-left: 2px solid var(--border);
  padding-left: 0.75rem;
}

.lp-agent--flaneur .lp-agent__philosophy {
  border-color: rgba(45, 212, 191, 0.35);
}

.lp-agent--completionist .lp-agent__philosophy {
  border-color: rgba(245, 158, 11, 0.35);
}

.lp-agent__traits {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  font-size: 0.82rem;
  color: var(--ink-3);
}

.lp-agent__traits li::before {
  content: '—';
  margin-right: 0.5rem;
  color: var(--ink-3);
  opacity: 0.5;
}

.lp-agents__vs {
  display: flex;
  align-items: center;
  justify-content: center;
}

.lp-agents__vs span {
  font-size: 0.85rem;
  font-weight: 800;
  letter-spacing: 0.15em;
  color: var(--ink-3);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 999px;
  padding: 0.5rem 1rem;
}

/* ──────────────────────────────────────────────
   HOW IT WORKS
   ────────────────────────────────────────────── */
.lp-how {
  padding: 5rem 0;
  border-top: 1px solid var(--border);
}

.lp-how__steps {
  display: flex;
  flex-direction: column;
  gap: 0;
  align-items: stretch;
}

@media (min-width: 800px) {
  .lp-how__steps {
    flex-direction: row;
    align-items: flex-start;
  }
}

.lp-how__step {
  flex: 1;
  padding: 1.5rem;
  border: 1px solid var(--border);
  border-radius: 1rem;
  background: var(--surface-raised);
}

.lp-how__num {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: linear-gradient(135deg, var(--teal), var(--amber));
  color: #0c0c0e;
  font-weight: 800;
  font-size: 0.85rem;
  display: grid;
  place-items: center;
  margin-bottom: 1rem;
}

.lp-how__step-title {
  font-size: 1rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.lp-how__step-body {
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--ink-2);
}

.lp-how__connector {
  width: 1px;
  height: 2rem;
  background: var(--border);
  margin: 0 auto;
}

@media (min-width: 800px) {
  .lp-how__connector {
    width: 2rem;
    height: 1px;
    margin: 2.25rem 0 0;
  }
}

/* ──────────────────────────────────────────────
   ACTION SECTION (AUTH / DASHBOARD)
   ────────────────────────────────────────────── */
.lp-action {
  padding: 5rem 0;
  border-top: 1px solid var(--border);
  background: var(--surface-raised);
}

/* --- AUTH --- */
.lp-auth {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2.5rem;
  max-width: 860px;
  margin: 0 auto;
}

@media (min-width: 700px) {
  .lp-auth {
    grid-template-columns: 1fr 1fr;
  }
}

.lp-auth__left {
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.lp-auth__title {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
  margin-bottom: 0.75rem;
}

.lp-auth__desc {
  font-size: 0.9rem;
  color: var(--ink-2);
  line-height: 1.55;
  margin-bottom: 1.25rem;
}

.lp-auth__perks {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  font-size: 0.82rem;
  color: var(--ink-2);
}

.lp-auth__perks li {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.lp-auth__form {
  padding: 1.5rem;
  border: 1px solid var(--border);
  border-radius: 1.1rem;
  background: var(--surface-card);
}

.lp-auth__form-title {
  font-size: 1.1rem;
  font-weight: 700;
}

/* --- DASHBOARD --- */
.lp-dash__header {
  margin-bottom: 2rem;
}

.lp-dash__greeting {
  font-size: 1.6rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.lp-dash__grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

@media (min-width: 800px) {
  .lp-dash__grid {
    grid-template-columns: 1fr 1fr;
  }
}

.lp-dash__card {
  border: 1px solid var(--border);
  border-radius: 1.1rem;
  background: var(--surface-card);
  padding: 1.5rem;
}

.lp-dash__empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.6rem;
  padding: 2.5rem 1rem;
  text-align: center;
  font-size: 0.85rem;
  color: var(--ink-3);
}

.lp-session {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid var(--border);
  border-radius: 0.75rem;
  background: rgba(255, 255, 255, 0.02);
  transition: background 0.15s, border-color 0.15s;
  text-decoration: none;
  color: inherit;
}

.lp-session:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
}

/* ──────────────────────────────────────────────
   BUTTONS
   ────────────────────────────────────────────── */
.lp-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.65rem 1.3rem;
  border-radius: 0.65rem;
  border: none;
  cursor: pointer;
  transition: transform 0.12s, box-shadow 0.15s, background 0.15s;
  text-decoration: none;
  line-height: 1;
}

.lp-btn:active {
  transform: scale(0.97);
}

.lp-btn--primary {
  background: linear-gradient(135deg, var(--teal), #14b8a6);
  color: #0c0c0e;
  box-shadow: 0 0 0 0 rgba(45, 212, 191, 0);
}

.lp-btn--primary:hover {
  box-shadow: 0 0 20px rgba(45, 212, 191, 0.25);
}

.lp-btn--primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.lp-btn--ghost {
  background: transparent;
  color: var(--ink-2);
  border: 1px solid var(--border);
}

.lp-btn--ghost:hover {
  background: rgba(255, 255, 255, 0.04);
  color: var(--ink);
}

.lp-btn-icon {
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  display: grid;
  place-items: center;
  background: transparent;
  border: 1px solid var(--border);
  color: var(--ink-2);
  cursor: pointer;
  transition: background 0.15s;
}

.lp-btn-icon:hover {
  background: rgba(255, 255, 255, 0.05);
}

.lp-btn-icon:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* ──────────────────────────────────────────────
   FOOTER
   ────────────────────────────────────────────── */
.lp-footer {
  border-top: 1px solid var(--border);
  padding: 2rem 1.25rem;
  text-align: center;
  font-size: 0.72rem;
  color: var(--ink-3);
  letter-spacing: 0.03em;
}
</style>
