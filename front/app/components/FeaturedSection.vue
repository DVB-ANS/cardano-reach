<script setup lang="ts">
const root = ref<HTMLElement>()
useScrollProgress(root, 'enter')
</script>

<template>
  <section id="featured" ref="root" class="px-3 pt-24 sm:px-5 sm:pt-32">
    <div class="mx-auto mb-4 flex max-w-6xl items-center gap-4">
      <span v-chars class="label">// featured task</span>
      <span class="chip">example</span>
    </div>

    <div class="featured group relative mx-auto h-[46svh] min-h-[340px] max-w-6xl overflow-hidden">
      <img src="/images/portal.webp" alt="A traveller walking towards a glowing doorway" loading="lazy" class="featured-img absolute inset-0 size-full object-cover">
      <div class="absolute inset-0 bg-gradient-to-b from-night/70 via-transparent to-night/80" />

      <div class="absolute left-4 top-4 sm:left-6 sm:top-6">
        <h2 v-chars class="wide max-w-3xl text-[clamp(1.6rem,3.2vw,3rem)]">Titanium fasteners, EN 9100</h2>
        <div v-reveal="400" class="mt-3 flex flex-wrap items-center gap-2">
          <span class="chip-outline">sourcing</span>
          <span class="chip">aerospace</span>
          <span class="chip">europe</span>
          <span class="label ml-1">by reach</span>
        </div>
      </div>


      <p class="label absolute bottom-5 left-4 max-w-xs text-cream sm:left-6">
        “I need a titanium fastener supplier, EN 9100 certified, small batches, Europe.”
      </p>
      <span class="chip absolute bottom-5 right-4 sm:right-6">7 suppliers · verified</span>
    </div>
  </section>
</template>

<style scoped>
.featured {
  clip-path: inset(calc((1 - var(--p, 1)) * 14%) calc((1 - var(--p, 1)) * 7%) round 0 0 var(--radius-notch-lg) 0);
}
.featured-img {
  transform: scale(calc(1.25 - .25 * var(--p, 1)));
  transition: filter .6s;
}
.featured:hover .featured-img { filter: brightness(1.12); }
</style>
