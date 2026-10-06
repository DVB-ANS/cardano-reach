/*
 * v-reveal  : fade-up when the element enters the viewport (optional delay in ms).
 * v-chars   : splits static text into characters that flicker in, in random order.
 * v-scramble: on hover, scrambles the text through glyphs before resolving it again.
 * Reveals wait for the `reach:loaded` event so nothing plays behind the preloader.
 */
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789/_#*<>'

export default defineNuxtPlugin(nuxtApp => {
  let observer: IntersectionObserver | undefined
  let loaded: Promise<void> | undefined

  const whenLoaded = () =>
    (loaded ??= new Promise<void>(resolve => {
      if (document.documentElement.classList.contains('is-loaded')) return resolve()
      window.addEventListener('reach:loaded', () => resolve(), { once: true })
    }))

  const observe = (el: HTMLElement) => {
    observer ??= new IntersectionObserver(
      (entries, obs) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          obs.unobserve(entry.target)
          whenLoaded().then(() => entry.target.classList.add('is-in'))
        }
      },
      { threshold: 0.01 },
    )
    observer.observe(el)
  }

  nuxtApp.vueApp.directive<HTMLElement, number | undefined>('reveal', {
    getSSRProps: binding => ({ class: 'reveal', style: binding.value ? `--d:${binding.value}ms` : undefined }),
    mounted(el, binding) {
      el.classList.add('reveal')
      if (binding.value) el.style.setProperty('--d', `${binding.value}ms`)
      observe(el)
    },
    unmounted: el => observer?.unobserve(el),
  })

  nuxtApp.vueApp.directive<HTMLElement, number | undefined>('chars', {
    mounted(el, binding) {
      const text = el.textContent ?? ''
      const spread = binding.value ?? 700
      el.setAttribute('aria-label', text.trim())
      el.classList.add('chars')
      el.innerHTML = ''
      for (const word of text.trim().split(/\s+/)) {
        const w = document.createElement('span')
        w.className = 'w'
        w.setAttribute('aria-hidden', 'true')
        for (const c of word) {
          const s = document.createElement('span')
          s.className = 'ch'
          s.textContent = c
          s.style.setProperty('--cd', `${Math.round(Math.random() * spread)}ms`)
          w.append(s)
        }
        el.append(w, ' ')
      }
      observe(el)
    },
    unmounted: el => observer?.unobserve(el),
  })

  nuxtApp.vueApp.directive<HTMLElement & { _scr?: number }>('scramble', {
    mounted(el) {
      const target = el.closest<HTMLElement>('a,button') ?? el
      const original = el.textContent ?? ''
      target.addEventListener('mouseenter', () => {
        if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
        cancelAnimationFrame(el._scr ?? 0)
        const start = performance.now()
        const step = (now: number) => {
          const done = Math.floor(((now - start) / 380) * original.length)
          el.textContent = [...original]
            .map((c, i) =>
              i < done || c === ' ' ? c : GLYPHS.charAt(Math.floor(Math.random() * GLYPHS.length)).toLowerCase(),
            )
            .join('')
          if (done < original.length) el._scr = requestAnimationFrame(step)
        }
        el._scr = requestAnimationFrame(step)
      })
    },
  })
})
