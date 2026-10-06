<template>
  <section id="top" class="h-[100svh] min-h-[620px] p-3 sm:p-5">
    <div class="relative h-full overflow-hidden">
      <img
        src="/images/hero.webp" alt="A lighthouse sweeping its beam across a starry sky" width="1672" height="941" fetchpriority="high"
        class="absolute inset-x-0 top-0 h-full w-full animate-[drift_40s_ease-in-out_infinite_alternate] object-cover will-change-transform max-md:-top-[20%]"
      >

      <div class="absolute bottom-0 right-0 max-w-[min(34rem,calc(100%-3.5rem))] rounded-tl-[var(--radius-notch)] bg-night pl-4 pt-4 sm:pl-5 sm:pt-5">
        <span class="notch" style="bottom:100%;right:0;--c:0 0" />
        <span class="notch" style="right:100%;bottom:0;--c:0 0" />
        <h1 v-chars class="wide text-[clamp(1.7rem,2.8vw,2.7rem)]">Leads with receipts.</h1>
        <div v-reveal="400">
          <p class="mt-4 max-w-md text-sm text-cream/70">
            Suppliers when you buy, clients when you sell. Reach brings back 5 to 10 companies — each one with a source and a date.
          </p>
          <div class="mt-4 flex flex-wrap gap-3">
            <ChipLink href="#how" label="how it works" icon="down" />
            <ChipLink href="https://preprod.sokosumi.com" label="open sokosumi" external />
          </div>
        </div>
      </div>

      <a href="#featured" class="absolute bottom-0 left-0 flex flex-col items-center gap-px rounded-tr-[var(--radius-notch)] bg-night pr-3 pt-3 sm:pr-4 sm:pt-4" aria-label="Scroll down">
        <span class="notch" style="bottom:100%;left:0;--c:100% 0" />
        <span class="notch" style="left:100%;bottom:0;--c:100% 0" />
        <span class="label bg-cream px-1 py-2 text-night [writing-mode:vertical-rl] rotate-180">scroll down</span>
        <span class="chip-icon"><ArrowIcon dir="down" /></span>
      </a>
    </div>
  </section>
</template>

<style scoped>
@keyframes drift {
  from { transform: scale(1.02); }
  to { transform: scale(1.09) translate3d(-1%, -.8%, 0); }
}
</style>
