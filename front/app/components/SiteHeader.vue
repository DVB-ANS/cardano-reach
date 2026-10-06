<script setup lang="ts">
const links = [
  { href: '#featured', label: 'Example' },
  { href: '#modes', label: 'Two modes' },
  { href: '#how', label: 'How it works' },
  { href: '#payment', label: 'Payment' },
]

const scrolled = ref(false)
const open = ref(false)

watch(open, v => document.documentElement.classList.toggle('has-menu', v))

onMounted(() => {
  const onScroll = () => { scrolled.value = window.scrollY > 60 }
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
  onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))
})
</script>

<template>
  <header class="pointer-events-none fixed inset-x-0 top-0 z-50">
    <div class="pointer-events-auto absolute left-0 top-0 bg-night p-3 pr-4 corner sm:p-5 sm:pr-5">
      <a
        href="#top" class="block overflow-hidden transition-[max-height,opacity,margin] duration-500"
        :class="scrolled && !open ? 'mb-0 max-h-0 opacity-0' : 'mb-3 max-h-24 opacity-100'"
      >
        <span class="wide block text-[2.6rem] leading-[.8] sm:text-[3.6rem]">Reach</span>
      </a>
      <div class="flex items-center gap-6 sm:gap-8">
        <span class="label cursor">your b2b scout</span>
        <button type="button" class="chip" :aria-expanded="open" @click="open = !open">
          <span v-scramble>{{ open ? 'close' : 'menu' }}</span>
        </button>
      </div>
      <template v-if="!scrolled && !open">
        <span class="notch" style="left:100%;top:var(--edge);--c:100% 100%" />
        <span class="notch" style="top:100%;left:var(--edge);--c:100% 100%" />
      </template>
    </div>

    <nav
      class="pointer-events-auto absolute right-5 top-5 hidden gap-5 transition-opacity duration-500 md:flex"
      :class="scrolled || open ? 'pointer-events-none opacity-0' : 'opacity-100'"
    >
      <a v-for="l in links.slice(2)" :key="l.href" :href="l.href" class="label text-cream hover:text-accent"><span v-scramble>{{ l.label.toLowerCase() }}</span></a>
    </nav>

    <Transition
      enter-from-class="opacity-0" enter-active-class="transition-opacity duration-500"
      leave-to-class="opacity-0" leave-active-class="transition-opacity duration-300"
    >
      <div v-if="open" class="pointer-events-auto fixed inset-0 -z-10 overflow-y-auto bg-night/85 px-3 pb-10 pt-44 sm:px-5 sm:pt-52" data-lenis-prevent>
        <div class="grid gap-12 md:grid-cols-[1.5fr_1fr]">
          <div class="flex gap-6">
            <span class="label shrink-0 pt-1">// discover</span>
            <ul>
              <li v-for="(l, i) in links" :key="l.href" class="reveal is-in" :style="{ '--d': `${i * 60}ms` }">
                <a :href="l.href" class="wide group inline-flex items-start gap-2 whitespace-nowrap text-[clamp(1.9rem,4.6vw,4rem)] leading-[.95] transition-colors hover:text-accent" @click="open = false">
                  {{ l.label }}
                  <span class="chip-icon mt-1 !size-4 group-hover:bg-accent"><ArrowIcon dir="right" /></span>
                </a>
              </li>
            </ul>
          </div>
          <div class="space-y-8 md:pt-2">
            <div class="flex gap-6 border-t border-cream/20 pt-3">
              <span class="label w-24 shrink-0">// built for</span>
              <span class="label">token2049 origins · masumi track</span>
            </div>
            <div class="flex gap-6 border-t border-cream/20 pt-3">
              <span class="label w-24 shrink-0">// runs on</span>
              <span class="label">sokosumi / masumi / cardano preprod</span>
            </div>
            <div class="flex flex-wrap gap-6 border-t border-cream/20 pt-3">
              <span class="label w-24 shrink-0">// links</span>
              <ChipLink href="https://preprod.sokosumi.com" label="sokosumi" external />
              <ChipLink href="https://github.com/DVB-ANS/cardano-reach" label="source code" external />
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </header>
</template>

<style scoped>
header { --edge: 0.75rem; }
@media (min-width: 640px) { header { --edge: 1.25rem; } }
</style>
