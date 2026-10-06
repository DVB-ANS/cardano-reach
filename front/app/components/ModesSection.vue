<script setup lang="ts">
const modes = [
  {
    id: 'sourcing',
    img: '/images/key.webp',
    alt: 'A giant key lying in a starry field',
    title: 'Suppliers when you buy',
    text: 'Machining, certified parts, auditors, integrators. Reach checks capacity and certifications, links the proof, flags what to verify and drafts your RFQ.',
    chips: ['capacity', 'certifications', 'red flags', 'rfq draft'],
  },
  {
    id: 'leads',
    img: '/images/booth.webp',
    alt: 'A lone phone booth under a spiral galaxy',
    title: 'Clients when you sell',
    text: 'Accounts that need what you sell, right now. Each one comes with a dated “why now” signal, an approach angle and a first message.',
    chips: ['fit', 'why now', 'angle', 'first message'],
  },
]
</script>

<template>
  <section id="modes" class="space-y-24 px-3 py-28 sm:space-y-32 sm:px-5 sm:py-40">
    <article
      v-for="(m, i) in modes" :key="m.id"
      class="grid items-start gap-6 md:grid-cols-2 md:gap-5"
    >
      <div :class="i % 2 && 'md:order-2'">
        <div v-reveal class="group relative aspect-[4/3] overflow-hidden corner-lg">
          <img :src="m.img" :alt="m.alt" loading="lazy" class="size-full object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-105">
          <span class="chip absolute left-4 top-4">mode 0{{ i + 1 }}</span>
        </div>
        <h2 v-chars class="wide mt-4 text-[clamp(1.6rem,3.2vw,3rem)]">{{ m.title }}</h2>
        <div class="mt-3"><ChipLink href="#how" :label="`${m.id} mode`" icon="right" /></div>
      </div>

      <div class="md:px-[8%] md:pt-4" :class="i % 2 && 'md:order-1'">
        <span class="label">// {{ m.id }}</span>
        <p v-reveal="150" class="mt-3 max-w-sm text-[15px] leading-relaxed text-cream/80">{{ m.text }}</p>
        <ul v-reveal="250" class="mt-5 flex max-w-sm flex-wrap gap-2">
          <li v-for="c in m.chips" :key="c" class="chip-outline">{{ c }}</li>
        </ul>
      </div>
    </article>
  </section>
</template>
