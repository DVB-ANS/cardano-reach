<script setup lang="ts">
const stars = [
  { top: '18%', left: '12%', animationDelay: '0s' },
  { top: '26%', left: '84%', animationDelay: '.8s' },
  { top: '12%', left: '58%', animationDelay: '1.6s' },
  { top: '34%', left: '30%', animationDelay: '2.1s' },
  { top: '8%', left: '76%', animationDelay: '.4s' },
  { top: '40%', left: '92%', animationDelay: '1.2s' },
]
</script>

<template>
  <section class="relative flex min-h-[90svh] items-start overflow-hidden">
    <img src="/images/sailboat.webp" alt="" loading="lazy" class="absolute inset-0 size-full object-cover animate-drift">
    <div class="absolute inset-0 bg-gradient-to-b from-ultra via-ultra/40 via-40% to-ink/80" />

    <div class="relative mx-auto w-full max-w-7xl px-4 pb-32 pt-[14vh] text-center sm:px-8">
      <span v-for="(p, i) in stars" :key="i" class="absolute size-1 rounded-full bg-cream animate-twinkle" :style="p" aria-hidden="true" />

      <h2 v-reveal class="mx-auto max-w-4xl font-display text-[clamp(3rem,8vw,6.5rem)] leading-[.92]">
        Your next partner is out there.<br><em class="text-ember">Reach finds it.</em>
      </h2>
      <div v-reveal="200" class="mt-10 flex flex-wrap justify-center gap-3">
        <a href="https://preprod.sokosumi.com" target="_blank" rel="noopener" class="btn-primary group">
          Hire Reach on Sokosumi <span class="transition-transform group-hover:translate-x-1">→</span>
        </a>
        <a href="https://github.com/DVB-ANS/cardano-reach" target="_blank" rel="noopener" class="btn-ghost">Source code</a>
      </div>
    </div>

    <footer class="absolute inset-x-0 bottom-0 border-t border-cream/15 bg-ink/40 backdrop-blur">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-cream/60 sm:px-8">
        <span class="flex items-center gap-2"><LighthouseMark class="size-4 text-cream" /> Reach · built at TOKEN2049 Origins</span>
        <span class="font-mono">Masumi · Sokosumi · Cardano Preprod</span>
      </div>
    </footer>
  </section>
</template>
