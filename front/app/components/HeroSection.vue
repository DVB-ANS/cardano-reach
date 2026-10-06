<template>
  <section id="top" class="relative h-[100svh] min-h-[620px] overflow-hidden">
    <div class="absolute inset-x-0 -top-[20%] bottom-[20%] animate-drift will-change-transform md:inset-0">
      <img
        src="/images/hero.webp" alt="" width="1672" height="941" fetchpriority="high"
        class="absolute inset-0 size-full object-cover"
      >
      <VortexCanvas :img-w="1672" :img-h="941" :vortex="[0.71, 0.355]" :lamp="[0.483, 0.5]" :base="[0.483, 0.69]" />
    </div>

    <div class="absolute inset-0 hidden bg-gradient-to-r from-ultra-deep/85 via-ultra-deep/30 to-transparent md:block" />
    <div class="absolute inset-0 bg-gradient-to-t from-ultra-deep via-ultra-deep/75 via-45% to-transparent to-75% md:hidden" />
    <div class="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-ultra to-transparent" />

    <div class="relative mx-auto flex h-full max-w-7xl flex-col justify-end px-4 pb-28 pt-16 md:justify-center md:pb-0 sm:px-8">
      <p v-reveal class="eyebrow flex items-center gap-2">
        <span class="size-1.5 rounded-full bg-ember animate-pulse-glow" />
        TOKEN2049 Origins · Masumi track · Cardano Preprod
      </p>

      <h1 v-reveal="120" class="mt-6 max-w-2xl font-display text-[clamp(2.9rem,6.4vw,5.4rem)] leading-[.92] tracking-tight">
        Find the companies<br>worth <em class="text-ember">reaching</em>.
      </h1>

      <p v-reveal="260" class="mt-7 max-w-lg text-base text-cream/80 sm:text-lg">
        Reach is a Sokosumi Coworker. Tell it what you buy or what you sell — it hunts the web and comes back
        with 5 to 10 companies. Every name sourced, every signal dated, one clear verdict.
      </p>

      <div v-reveal="400" class="mt-9 flex flex-wrap gap-3">
        <a href="#demo" class="btn-primary group">
          See it work
          <span class="transition-transform group-hover:translate-x-1">→</span>
        </a>
        <a href="#payment" class="btn-ghost">How it gets paid</a>
      </div>
    </div>

    <a href="#problem" class="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-cream/60 hover:text-cream" aria-label="Scroll">
      <span class="eyebrow">Scroll</span>
      <span class="block h-10 w-px overflow-hidden bg-cream/20">
        <span class="block h-1/2 w-full bg-cream animate-[scrollcue_1.8s_ease-in-out_infinite]" />
      </span>
    </a>
  </section>
</template>

<style scoped>
@keyframes scrollcue {
  from { transform: translateY(-100%); }
  to { transform: translateY(200%); }
}
</style>
