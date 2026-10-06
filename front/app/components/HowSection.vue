<script setup lang="ts">
const steps = [
  { t: 'Ask', d: 'Describe what you buy or sell in one sentence, as a Task on Sokosumi. If something is missing, Reach asks one question.' },
  { t: 'Hunt & verify', d: 'Reach searches the web, company pages and niche directories. Every row keeps a source link and a date.' },
  { t: 'Get your shortlist', d: '5 to 10 companies, a verdict and a first message ready to send. Paid 1 USDM per Task, settled on Cardano.' },
]
</script>

<template>
  <section id="how" class="px-3 py-24 sm:px-5 sm:py-32">
    <div class="mx-auto max-w-6xl">
      <span v-chars class="label">// how it works</span>
      <h2 v-chars class="wide mt-4 text-[clamp(2rem,4.4vw,4rem)]">Three steps. One shortlist.</h2>

      <ol class="mt-14 grid gap-10 md:grid-cols-3 md:gap-6">
        <li v-for="(s, i) in steps" :key="s.t" v-reveal="i * 120" class="border-t border-cream/25 pt-5">
          <span class="label text-cream/50">0{{ i + 1 }}</span>
          <h3 class="wide mt-3 text-2xl">{{ s.t }}</h3>
          <p class="mt-3 text-[15px] leading-relaxed text-cream/75">{{ s.d }}</p>
        </li>
      </ol>
    </div>
  </section>
</template>
