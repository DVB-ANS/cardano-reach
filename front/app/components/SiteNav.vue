<script setup lang="ts">
const links = [
  { href: '#modes', label: 'Modes' },
  { href: '#how', label: 'How it works' },
  { href: '#demo', label: 'Demo' },
  { href: '#niches', label: 'Niches' },
  { href: '#payment', label: 'Payment' },
]

const scrolled = ref(false)
const open = ref(false)

onMounted(() => {
  const onScroll = () => { scrolled.value = window.scrollY > 40 }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
})
</script>

<template>
  <header
    class="fixed inset-x-0 top-0 z-50 transition-all duration-500"
    :class="scrolled || open ? 'bg-ultra-deep/80 backdrop-blur-md border-b border-cream/10' : 'bg-transparent'"
  >
    <nav class="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-8">
      <a href="#top" class="group flex items-center gap-2.5" @click="open = false">
        <LighthouseMark class="size-7 text-cream transition-transform duration-500 group-hover:-rotate-6" />
        <span class="font-display text-2xl tracking-wide">Reach</span>
      </a>

      <ul class="hidden items-center gap-8 text-sm text-cream/75 md:flex">
        <li v-for="l in links" :key="l.href">
          <a :href="l.href" class="relative transition-colors hover:text-cream after:absolute after:-bottom-1 after:left-0 after:h-px after:w-full after:origin-left after:scale-x-0 after:bg-ember after:transition-transform after:duration-300 hover:after:scale-x-100">{{ l.label }}</a>
        </li>
      </ul>

      <a href="https://preprod.sokosumi.com" target="_blank" rel="noopener" class="btn-primary hidden !py-2 md:inline-flex">
        Open Sokosumi
      </a>

      <button class="md:hidden p-2 -mr-2" :aria-expanded="open" aria-label="Menu" @click="open = !open">
        <span class="block h-px w-6 bg-cream transition-transform duration-300" :class="open && 'translate-y-[5px] rotate-45'" />
        <span class="mt-2 block h-px w-6 bg-cream transition-transform duration-300" :class="open && '-translate-y-[4px] -rotate-45'" />
      </button>
    </nav>

    <Transition
      enter-from-class="opacity-0 -translate-y-2" enter-active-class="transition duration-300"
      leave-to-class="opacity-0 -translate-y-2" leave-active-class="transition duration-200"
    >
      <ul v-if="open" class="space-y-1 px-4 pb-6 md:hidden">
        <li v-for="l in links" :key="l.href">
          <a :href="l.href" class="block py-2 font-display text-3xl" @click="open = false">{{ l.label }}</a>
        </li>
      </ul>
    </Transition>
  </header>
</template>
