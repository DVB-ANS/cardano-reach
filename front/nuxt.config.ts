import tailwindcss from '@tailwindcss/vite'

export default defineNuxtConfig({
  compatibilityDate: '2026-10-01',
  devtools: { enabled: false },
  css: ['lenis/dist/lenis.css', '~/assets/css/main.css'],
  vite: { plugins: [tailwindcss()] },
  app: {
    head: {
      title: 'Reach — sourced B2B shortlists, paid on Cardano',
      htmlAttrs: { lang: 'en' },
      meta: [
        { name: 'description', content: 'Reach is a Sokosumi Coworker that finds the right suppliers or clients and returns a sourced, dated shortlist. Paid per Task through Masumi escrow on Cardano.' },
        { name: 'theme-color', content: '#020718' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
        { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' },
        { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Archivo:wdth,wght@100..125,700..900&family=DM+Mono:wght@300;400&family=Geist:wght@400;500&display=swap' },
        { rel: 'preload', as: 'image', href: '/images/hero.webp' },
      ],
      noscript: [{ innerHTML: '<style>.reveal{opacity:1!important;transform:none!important}.preloader{display:none!important}</style>' }],
    },
  },
})
