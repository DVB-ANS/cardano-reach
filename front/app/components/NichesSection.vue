<script setup lang="ts">
const niches = [
  { slug: 'aero-spatial', name: 'Aerospace', img: '/images/balloon.webp', src: 'Certified parts, materials, testing, MRO', leads: 'Airlines, charter operators, NewSpace', proofs: ['EN 9100', 'Part 145', 'Public contracts'] },
  { slug: 'automobile', name: 'Automotive', img: '/images/road.webp', src: 'Prototyping, machining, embedded electronics', leads: 'Tier-1 suppliers, OEMs, fleets', proofs: ['IATF 16949', 'ISO 9001', 'Trade shows'] },
  { slug: 'crypto-defi', name: 'Crypto & DeFi', img: '/images/tree.webp', src: 'Auditors, market makers, RPC & oracles', leads: 'Protocols needing liquidity or audits', proofs: ['Public audits', 'GitHub activity', 'TVL'] },
  { slug: 'saas-tech-b2b', name: 'SaaS & B2B tech', img: '/images/booth.webp', src: 'Integrators, agencies, specialists', leads: 'Scale-ups raising or hiring', proofs: ['Funding rounds', 'Job posts', 'Changelog'] },
]
</script>

<template>
  <section id="niches" class="relative py-28 sm:py-36">
    <div class="mx-auto max-w-7xl px-4 sm:px-8">
      <div class="flex flex-wrap items-end justify-between gap-6">
        <div class="max-w-2xl">
          <p v-reveal class="eyebrow">Niches</p>
          <h2 v-reveal="100" class="mt-4 font-display text-5xl leading-[.95] sm:text-6xl">
            Each niche knows <em class="text-ember">where to look</em>.
          </h2>
        </div>
        <p v-reveal="200" class="max-w-sm text-sm text-cream/70">
          A niche is one Markdown file: vocabulary, priority sources, fit criteria, “why now” signals and red flags.
          Adding a niche means adding a file — no code.
        </p>
      </div>

      <div class="mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <article
          v-for="(n, i) in niches" :key="n.slug" v-reveal="i * 120"
          class="group relative aspect-[3/4] overflow-hidden border border-cream/20"
        >
          <img :src="n.img" :alt="''" loading="lazy" class="absolute inset-0 size-full object-cover transition-transform duration-[1.4s] ease-out group-hover:scale-110 group-hover:rotate-1">
          <div class="absolute inset-0 bg-gradient-to-t from-ink via-ink/50 to-transparent transition-opacity duration-500 group-hover:via-ink/80" />

          <div class="absolute inset-x-0 bottom-0 p-5">
            <p class="font-mono text-[10px] text-cream/60">niches/{{ n.slug }}.md</p>
            <h3 class="mt-1 font-display text-3xl">{{ n.name }}</h3>

            <div class="grid grid-rows-[0fr] transition-[grid-template-rows] duration-500 group-hover:grid-rows-[1fr] group-focus-within:grid-rows-[1fr] max-lg:grid-rows-[1fr]">
              <div class="overflow-hidden">
                <dl class="mt-3 space-y-2 text-xs text-cream/80">
                  <div><dt class="eyebrow !text-[9px]">Sourcing</dt><dd>{{ n.src }}</dd></div>
                  <div><dt class="eyebrow !text-[9px]">Leads</dt><dd>{{ n.leads }}</dd></div>
                </dl>
                <ul class="mt-3 flex flex-wrap gap-1.5">
                  <li v-for="p in n.proofs" :key="p" class="rounded-full border border-cream/30 px-2 py-0.5 font-mono text-[10px]">{{ p }}</li>
                </ul>
              </div>
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>
