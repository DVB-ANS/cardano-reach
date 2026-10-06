export default defineNuxtPlugin((nuxtApp) => {
  let observer: IntersectionObserver | undefined

  const observe = (el: HTMLElement) => {
    observer ??= new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        entry.target.classList.add('is-in')
        observer!.unobserve(entry.target)
      }
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 })
    observer.observe(el)
  }

  nuxtApp.vueApp.directive<HTMLElement, number | undefined>('reveal', {
    getSSRProps: binding => ({ class: 'reveal', style: binding.value ? `--d:${binding.value}ms` : undefined }),
    mounted(el, binding) {
      el.classList.add('reveal')
      if (binding.value) el.style.setProperty('--d', `${binding.value}ms`)
      observe(el)
    },
    unmounted(el) {
      observer?.unobserve(el)
    },
  })
})
