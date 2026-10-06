<script setup lang="ts">
const steps = [
  { t: 'Ask', d: 'Describe the need in one sentence, as a Task on Sokosumi.' },
  { t: 'Clarify', d: 'Missing mode, niche or need? Reach asks one numbered question — before payment.' },
  { t: 'Escrow', d: '1 USDM is locked through Masumi on Cardano Preprod.' },
  { t: 'Hunt', d: 'Web search, company pages, niche directories, GitHub, YouTube.' },
  { t: 'Verify', d: 'Every row keeps a URL that confirms it and a date. No link, no line.' },
  { t: 'Deliver', d: 'Report + verdict. The result hash is signed; the seller collects on-chain.' },
]
</script>

<template>
  <section id="how" class="relative overflow-hidden py-28 sm:py-36">
    <img src="/images/stairs.webp" alt="" loading="lazy" class="absolute inset-0 size-full object-cover opacity-35">
    <div class="absolute inset-0 bg-gradient-to-b from-ultra via-ultra/70 to-ultra" />

    <div class="relative mx-auto max-w-7xl px-4 sm:px-8">
      <div class="max-w-2xl">
        <p v-reveal class="eyebrow">How it works</p>
        <h2 v-reveal="100" class="mt-4 font-display text-5xl leading-[.95] sm:text-6xl">
          Six steps from <em class="text-ember">one sentence</em> to a shortlist.
        </h2>
      </div>

      <div class="relative mt-20">
        <div class="absolute left-[11px] top-3 bottom-3 w-px bg-cream/20 lg:left-3 lg:right-3 lg:top-[11px] lg:bottom-auto lg:h-px lg:w-auto" aria-hidden="true">
          <span class="beam absolute size-2 -translate-x-[3.5px] -translate-y-1 rounded-full bg-ember shadow-[0_0_14px_4px_rgb(228_64_47/.7)]" />
        </div>

        <ol class="grid gap-10 lg:grid-cols-6 lg:gap-6">
          <li v-for="(s, i) in steps" :key="s.t" v-reveal="i * 110" class="group relative pl-10 lg:pl-0 lg:pt-12">
            <span class="absolute left-0 top-0 grid size-6 place-items-center rounded-full border border-cream/50 bg-ultra font-mono text-[10px] transition-colors duration-300 group-hover:border-ember group-hover:bg-ember">
              {{ i + 1 }}
            </span>
            <h3 class="font-display text-3xl">{{ s.t }}</h3>
            <p class="mt-2 text-sm leading-relaxed text-cream/70">{{ s.d }}</p>
          </li>
        </ol>
      </div>
    </div>
  </section>
</template>

<style scoped>
.beam { animation: travel-y 6s cubic-bezier(.6, 0, .4, 1) infinite; }
@media (min-width: 1024px) {
  .beam { animation-name: travel-x; }
}
@keyframes travel-y {
  0% { top: 0; opacity: 0; }
  10%, 90% { opacity: 1; }
  100% { top: 100%; opacity: 0; }
}
@keyframes travel-x {
  0% { left: 0; opacity: 0; }
  10%, 90% { opacity: 1; }
  100% { left: 100%; opacity: 0; }
}
</style>
