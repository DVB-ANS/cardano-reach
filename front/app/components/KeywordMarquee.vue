<script setup lang="ts">
const words = ['EN 9100', 'IATF 16949', 'ISO 9001', 'Part 145', 'Aiken audits', 'TVL', 'Series A', 'DPO hiring', 'Gigafactory lines', 'Charter fleets', 'RFQ ready', 'Why now']
</script>

<template>
  <div class="relative -rotate-1 overflow-hidden border-y border-cream/20 bg-cream py-4 text-ultra" aria-hidden="true">
    <div class="flex w-max animate-marquee gap-10 whitespace-nowrap font-display text-3xl italic hover:[animation-play-state:paused]">
      <template v-for="k in 2" :key="k">
        <span v-for="w in words" :key="`${k}-${w}`" class="flex items-center gap-10">
          {{ w }} <span class="not-italic text-ember">✦</span>
        </span>
      </template>
    </div>
  </div>
</template>
