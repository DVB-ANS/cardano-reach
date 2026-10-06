<script setup lang="ts">
const flow = [
  { t: 'Buyer', d: 'Pays in Sokosumi credits. No wallet, no crypto to learn.', tag: 'web2' },
  { t: 'Masumi escrow', d: '1 USDM locked on Cardano. Input hash and deadlines are signed.', tag: 'lock' },
  { t: 'Reach delivers', d: 'The report is hashed and submitted before the deadline.', tag: 'hash' },
  { t: 'Seller collects', d: 'Funds unlock and are collected on-chain — verifiable on the explorer.', tag: 'tx' },
]
</script>

<template>
  <section id="payment" class="relative py-28 sm:py-36">
    <div class="mx-auto grid max-w-7xl items-center gap-14 px-4 sm:px-8 lg:grid-cols-2 lg:gap-20">
      <div>
        <p v-reveal class="eyebrow">Agentic payments on Cardano</p>
        <h2 v-reveal="100" class="mt-4 font-display text-5xl leading-[.95] sm:text-6xl">
          Paid per Task.<br><em class="text-ember">Settled on-chain.</em>
        </h2>
        <p v-reveal="200" class="mt-6 max-w-lg text-cream/75">
          No subscription and no API key on the buyer's side. Reach earns per job through Masumi,
          and tomorrow other agents can hire it the same way.
        </p>

        <div class="relative mt-12 pl-10">
          <span class="absolute left-[11px] top-2 bottom-2 w-px overflow-hidden bg-cream/20" aria-hidden="true">
            <span class="coin absolute left-0 h-10 w-full bg-gradient-to-b from-transparent via-ember to-transparent" />
          </span>
          <ol class="space-y-8">
          <li v-for="(f, i) in flow" :key="f.t" v-reveal="i * 140" class="relative">
            <span class="absolute -left-10 top-0.5 grid size-6 place-items-center rounded-full border border-cream/40 bg-ultra font-mono text-[10px]">{{ i + 1 }}</span>
            <h3 class="text-lg font-medium">{{ f.t }} <span class="ml-1.5 font-mono text-[10px] uppercase tracking-wider text-ember">{{ f.tag }}</span></h3>
            <p class="mt-1 text-sm text-cream/65">{{ f.d }}</p>
          </li>
          </ol>
        </div>
      </div>

      <div v-reveal="150" class="relative">
        <div class="frame aspect-[4/5] sm:aspect-[4/3] lg:aspect-[4/5]">
          <img src="/images/portal.webp" alt="A traveller walking towards a glowing doorway" loading="lazy" class="size-full object-cover">
        </div>
        <div class="absolute -bottom-6 left-4 right-4 animate-float border border-cream/25 bg-ink/85 p-5 backdrop-blur sm:-left-6 sm:right-auto sm:max-w-xs">
          <p class="eyebrow !text-ember">Proof that counts</p>
          <p class="mt-2 text-sm">A finished Task is not proof of payment. The confirmed collection transaction is.</p>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.coin { animation: drop 3.6s ease-in-out infinite; }
@keyframes drop {
  from { top: -2.5rem; }
  to { top: 100%; }
}
</style>
