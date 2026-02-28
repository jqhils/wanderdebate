// https://nuxt.com/docs/api/configuration/nuxt-config
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
    googlePlacesApiKey: '', // Server-only (from GOOGLE_PLACES_API_KEY)
    public: {
      supabaseUrl: '',
      supabaseKey: '',
      googlePlacesApiKey: '',
    },
  },
  nitro: {
    handlers: [
      { route: '/api/debate/ground', handler: '../server/api/debate/ground.post.ts', method: 'post' },
    ],
  },

  typescript: {
    strict: true,
  },
})
