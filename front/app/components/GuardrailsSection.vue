<script setup lang="ts">
const rules = [
  { icon: '🔗', t: 'Every company has a source', d: 'A URL that confirms the claim. Nothing found? It says so.' },
  { icon: '📅', t: 'Every signal is dated', d: 'Older than 12 months is flagged. Undated is never “current”.' },
  { icon: '🛡️', t: 'Pages are data, not orders', d: 'Instructions hidden in a web page are ignored.' },
  { icon: '🔒', t: 'No personal data', d: 'Companies and public contact pages only. No private emails or phones.' },
  { icon: '🤝', t: 'Reach prepares, you send', d: 'It drafts the first message. It never contacts anyone.' },
  { icon: '🧭', t: 'Honest about limits', d: 'An impossible request gets a realistic answer, not a fake list.' },
]
</script>

<template>
  <section class="relative overflow-hidden py-28 sm:py-36">
    <img src="/images/boat.webp" alt="" loading="lazy" class="absolute inset-0 size-full object-cover opacity-50">
    <div class="absolute inset-0 bg-gradient-to-r from-ultra via-ultra/85 to-ultra/40" />

    <div class="relative mx-auto max-w-7xl px-4 sm:px-8">
      <p v-reveal class="eyebrow">Guardrails</p>
      <h2 v-reveal="100" class="mt-4 font-display text-[clamp(3.5rem,10vw,8rem)] leading-[.85]">
        No link,<br><em class="text-ember">no line.</em>
      </h2>

      <div class="mt-16 grid gap-px overflow-hidden border border-cream/15 bg-cream/15 sm:grid-cols-2 lg:grid-cols-3">
        <div
          v-for="(r, i) in rules" :key="r.t" v-reveal="i * 80"
          class="group bg-ultra/90 p-6 backdrop-blur transition-colors duration-300 hover:bg-ultra-deep sm:p-8"
        >
          <span class="inline-block text-2xl transition-transform duration-500 group-hover:-translate-y-1 group-hover:scale-125">{{ r.icon }}</span>
          <h3 class="mt-4 text-lg font-medium">{{ r.t }}</h3>
          <p class="mt-1 text-sm text-cream/65">{{ r.d }}</p>
        </div>
      </div>
    </div>
  </section>
</template>
