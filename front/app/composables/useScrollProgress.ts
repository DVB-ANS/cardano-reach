type Mode = 'through' | 'enter' | 'pin'

/*
 * Writes the element's scroll progress (0..1) into its `--p` CSS variable.
 * through: from entering the bottom of the viewport to leaving the top.
 * enter  : from entering the bottom to its top reaching ~10% of the viewport.
 * pin    : across a tall container whose sticky child stays on screen.
 */
export function useScrollProgress(el: Ref<HTMLElement | undefined>, mode: Mode = 'through') {
  onMounted(() => {
    const node = el.value
    if (!node) return
    let raf = 0

    const update = () => {
      raf = 0
      const r = node.getBoundingClientRect()
      const vh = window.innerHeight
      const v =
        mode === 'enter'
          ? (vh - r.top) / (vh * 0.9)
          : mode === 'pin'
            ? -r.top / Math.max(1, r.height - vh)
            : (vh - r.top) / (vh + r.height)
      node.style.setProperty('--p', Math.min(1, Math.max(0, v)).toFixed(4))
    }
    const schedule = () => {
      raf ||= requestAnimationFrame(update)
    }

    update()
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    onBeforeUnmount(() => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    })
  })
}
