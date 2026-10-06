<script setup lang="ts">
const links = [
  { href: '#featured', label: 'Example' },
  { href: '#modes', label: 'Two modes' },
  { href: '#how', label: 'How it works' },
  { href: '#payment', label: 'Payment' },
]
</script>

<template>
  <footer class="overflow-hidden px-3 pt-24 sm:px-5">
    <div class="grid gap-12 border-t border-cream/20 pt-6 md:grid-cols-2">
      <div class="flex gap-6">
        <span class="label shrink-0 pt-1">// explore</span>
        <ul>
          <li v-for="l in links" :key="l.href">
            <a :href="l.href" class="wide group inline-flex items-start gap-1.5 text-[clamp(1.6rem,3vw,2.6rem)] leading-[.95] transition-colors hover:text-accent">
              {{ l.label }}
              <span class="chip-icon mt-0.5 !size-3.5 group-hover:!bg-accent"><ArrowIcon dir="right" /></span>
            </a>
          </li>
        </ul>
      </div>
      <div class="space-y-0">
        <div class="flex gap-6 border-b border-cream/20 py-3">
          <span class="label w-24 shrink-0">// built for</span>
          <span class="label">token2049 origins · masumi track</span>
        </div>
        <div class="flex gap-6 border-b border-cream/20 py-3">
          <span class="label w-24 shrink-0">// runs on</span>
          <span class="label">sokosumi / masumi / cardano preprod</span>
        </div>
        <div class="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-cream/20 py-3">
          <span class="label w-24 shrink-0">// links</span>
          <ChipLink href="https://preprod.sokosumi.com" label="hire richard" external />
          <ChipLink href="https://github.com/DVB-ANS/cardano-reach" label="source code" external />
        </div>
      </div>
    </div>

    <div class="wide mt-20 flex items-end justify-between text-[12.5vw] leading-[.74]" aria-hidden="true">
      <span v-chars="1200">Richard</span><span class="text-accent">//</span>
    </div>
  </footer>
</template>
