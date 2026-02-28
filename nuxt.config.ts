// https://nuxt.com/docs/api/configuration/nuxt-config
function parseBooleanFlag(value: string | undefined, defaultValue = true): boolean {
  if (!value) return defaultValue
  return !['0', 'false', 'no', 'off'].includes(value.trim().toLowerCase())
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  future: { compatibilityVersion: 3 },
  srcDir: 'app/',
  css: ['~/assets/css/main.css'],

  modules: [
    '@nuxt/ui',
    '@pinia/nuxt',
    '@vueuse/nuxt',
    '@nuxt/icon',
    '@nuxtjs/supabase',
  ],

  supabase: {
    redirect: false,
    // Keep compatibility with existing project env naming.
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
    secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  },

  runtimeConfig: {
    mistralApiKey: '', // Server-only (from NUXT_MISTRAL_API_KEY)
    minimaxApiKey: '', // Server-only (from NUXT_MINIMAX_API_KEY)
    minimaxBaseUrl: process.env.NUXT_MINIMAX_BASE_URL || 'https://api.minimax.io/v1', // Server-only
    dailyItineraryLimitEnabled: parseBooleanFlag(process.env.NUXT_DAILY_ITINERARY_LIMIT_ENABLED, true),
    public: {
      supabaseUrl: '',
      supabaseKey: '',
    },
  },

  typescript: {
    strict: true,
  },
})
