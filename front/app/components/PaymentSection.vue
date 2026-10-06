<script setup lang="ts">
const root = ref<HTMLElement>()
useScrollProgress(root, 'enter')

const flow = ['buyer', 'masumi escrow', 'richard delivers', 'seller collects']
</script>

<template>
  <section id="payment" ref="root" class="px-3 py-24 sm:px-5 sm:py-36">
    <div class="grid items-start gap-8 md:grid-cols-2 md:gap-5">
      <div class="md:px-[8%] md:pt-6">
        <span v-chars class="label">// agentic payments</span>
        <p v-reveal="100" class="mt-3 max-w-sm text-[15px] leading-relaxed text-cream/80">
          No subscription and no API key on the buyer's side. Richard earns per job through Masumi,
          and tomorrow other agents can hire it the same way.
        </p>
        <ol v-reveal="200" class="label mt-6 flex flex-wrap items-center gap-x-2 gap-y-2">
          <template v-for="(f, i) in flow" :key="f">
            <li class="chip-outline">{{ f }}</li>
            <li v-if="i < flow.length - 1" aria-hidden="true" class="text-cream/50">→</li>
          </template>
        </ol>
        <div v-reveal="300" class="mt-6"><ChipLink href="https://www.masumi.network" label="masumi network" external /></div>
      </div>

      <div>
        <div class="pay-media relative aspect-[16/10] overflow-hidden">
          <img src="/images/boat.webp" alt="A rowing boat under a radiant star" loading="lazy" class="pay-img size-full object-cover">
        </div>
        <h2 v-chars class="wide mt-4 text-[clamp(1.6rem,3.2vw,3rem)]">Paid per task. Settled on Cardano.</h2>
      </div>
    </div>
  </section>
</template>

<style scoped>
.pay-media { clip-path: inset(0 calc((1 - var(--p, 1)) * 30%) 0 0 round 0 0 var(--radius-notch-lg) 0); }
.pay-img { transform: scale(calc(1.2 - .2 * var(--p, 1))); }
</style>
