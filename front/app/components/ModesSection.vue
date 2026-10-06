<script setup lang="ts">
const modes = [
  {
    n: '01',
    name: 'Sourcing',
    who: 'You buy.',
    img: '/images/key.webp',
    alt: 'A giant key lying in a starry field',
    ask: 'I need a titanium fastener supplier, EN 9100 certified, small batches, in Europe.',
    gets: ['Capacity & certifications, each with a proof link', 'Country and delivery zone', 'Red flags worth checking', 'A first RFQ message, ready to copy'],
  },
  {
    n: '02',
    name: 'Leads',
    who: 'You sell.',
    img: '/images/portal-red.webp',
    alt: 'A glowing doorway opening onto red light',
    ask: 'We build battery test benches. Who needs one right now?',
    gets: ['Target accounts that fit your offer', 'A dated “why now” signal per account', 'An approach angle for each one', 'A first outreach message, ready to copy'],
  },
]
</script>

<template>
  <section id="modes" class="relative py-28 sm:py-36">
    <div class="pointer-events-none absolute inset-0 stipple opacity-30 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

    <div class="relative mx-auto max-w-7xl px-4 sm:px-8">
      <div class="max-w-2xl">
        <p v-reveal class="eyebrow">Two modes, one engine</p>
        <h2 v-reveal="100" class="mt-4 font-display text-5xl leading-[.95] sm:text-6xl">
          Suppliers when you buy.<br><em class="text-ember">Clients</em> when you sell.
        </h2>
      </div>

      <div class="mt-16 grid gap-8 md:grid-cols-2">
        <article
          v-for="(m, i) in modes" :key="m.n" v-reveal="i * 160"
          class="group frame bg-ultra-deep/50 transition duration-500 hover:-translate-y-2"
        >
          <div class="relative aspect-[16/9] overflow-hidden">
            <img :src="m.img" :alt="m.alt" loading="lazy" class="size-full object-cover transition-transform duration-[1.6s] ease-out group-hover:scale-110">
            <div class="absolute inset-0 bg-gradient-to-t from-ultra-deep via-transparent" />
            <span class="absolute left-5 top-5 font-mono text-xs text-cream/80">MODE {{ m.n }}</span>
          </div>

          <div class="p-6 sm:p-8">
            <div class="flex items-baseline justify-between gap-4">
              <h3 class="font-display text-4xl">{{ m.name }}</h3>
              <span class="font-display text-2xl italic text-ember">{{ m.who }}</span>
            </div>

            <blockquote class="mt-5 border-l-2 border-ember pl-4 text-cream/85">“{{ m.ask }}”</blockquote>

            <ul class="mt-6 grid gap-2.5 text-sm text-cream/75">
              <li v-for="g in m.gets" :key="g" class="flex gap-3">
                <span class="mt-2 size-1 shrink-0 rounded-full bg-cream/60 transition-colors group-hover:bg-ember" />
                {{ g }}
              </li>
            </ul>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
