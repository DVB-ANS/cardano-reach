<script setup lang="ts">
const pains = [
  { k: '01', t: 'Directories are stale', d: 'Half the listings closed, moved or stopped making that part years ago.' },
  { k: '02', t: 'Contact lists are not answers', d: 'A spreadsheet of 2,000 emails does not tell you who to call first.' },
  { k: '03', t: 'Nobody dates their signals', d: 'A “recent” funding round from 2023 is not a reason to call today.' },
]
</script>

<template>
  <section id="problem" class="relative py-28 sm:py-36">
    <div class="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-8 lg:grid-cols-[1.1fr_1fr] lg:gap-20">
      <div v-reveal class="frame aspect-[4/3] lg:aspect-[5/4]">
        <img src="/images/city.webp" alt="A lone figure with a briefcase between towering buildings" loading="lazy" class="size-full object-cover transition-transform duration-[2s] hover:scale-105">
        <span class="absolute left-4 top-4 eyebrow bg-ultra-deep/70 px-2 py-1 backdrop-blur">The B2B search, today</span>
      </div>

      <div>
        <p v-reveal class="eyebrow">The problem</p>
        <h2 v-reveal="100" class="mt-4 font-display text-5xl leading-[.95] sm:text-6xl">
          Finding the right partner still takes <em class="text-ember">a week of tabs</em>.
        </h2>

        <ul class="mt-10 space-y-6">
          <li v-for="(p, i) in pains" :key="p.k" v-reveal="200 + i * 120" class="group flex gap-5 border-t border-cream/15 pt-6">
            <span class="font-mono text-xs text-ember">{{ p.k }}</span>
            <div>
              <h3 class="text-lg font-medium transition-transform duration-300 group-hover:translate-x-1">{{ p.t }}</h3>
              <p class="mt-1 text-cream/65">{{ p.d }}</p>
            </div>
          </li>
        </ul>

        <p v-reveal="560" class="mt-10 font-display text-2xl italic text-cream/90">
          Reach answers the question you actually have: who should I contact first, and why?
        </p>
      </div>
    </div>
  </section>
</template>
