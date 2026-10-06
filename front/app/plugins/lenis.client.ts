import Lenis from 'lenis'

export default defineNuxtPlugin(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return { provide: { lenis: undefined } }
  const lenis = new Lenis({ autoRaf: true, anchors: { offset: -16 }, lerp: 0.09 })
  return { provide: { lenis } }
})
