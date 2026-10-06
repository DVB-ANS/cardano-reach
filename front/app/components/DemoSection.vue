<script setup lang="ts">
const REQUEST = 'I need a titanium fastener supplier, EN 9100 certified, small batches, Europe.'

const rows = [
  { co: 'Company A', cc: 'FR', why: 'Ti-6Al-4V fasteners, 50–5,000 pcs runs', proof: 'EN 9100 certificate', date: '2026-08', fresh: 'new', score: 92 },
  { co: 'Company B', cc: 'DE', why: 'Aero fasteners, 4-week lead time announced', proof: 'Certification registry', date: '2026-05', fresh: 'new', score: 86 },
  { co: 'Company C', cc: 'IT', why: 'Small-batch machining, aero references', proof: 'Customer case study', date: '2025-07', fresh: 'old', score: 71 },
  { co: 'Company D', cc: 'ES', why: 'Fasteners + surface treatment in-house', proof: 'Product page', date: 'undated', fresh: 'none', score: 58 },
] as const

const badge = {
  new: 'bg-emerald-400/15 text-emerald-200 border-emerald-300/30',
  old: 'bg-amber-400/15 text-amber-200 border-amber-300/30',
  none: 'bg-cream/10 text-cream/60 border-cream/20',
}

const status = computed(() => {
  if (stage.value >= 6) return { label: 'COMPLETED', cls: 'bg-emerald-400/20 text-emerald-200' }
  if (stage.value === 2) return { label: 'INPUT_REQUIRED', cls: 'bg-ember/25 text-cream' }
  return { label: 'RUNNING', cls: 'bg-cream/15 text-cream' }
})

const stage = ref(0)
const typed = ref('')
const pages = ref(0)
const shownRows = ref(0)
const root = ref<HTMLElement>()
const thread = ref<HTMLElement>()
let runId = 0

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))

async function play() {
  const id = ++runId
  const alive = () => id === runId
  stage.value = 1
  typed.value = ''
  pages.value = 0
  shownRows.value = 0

  for (const ch of REQUEST) {
    typed.value += ch
    await sleep(22)
    if (!alive()) return
  }
  const beats: [number, () => void][] = [
    [700, () => (stage.value = 2)],
    [2200, () => (stage.value = 3)],
    [900, () => (stage.value = 4)],
    [900, () => (stage.value = 5)],
  ]
  for (const [ms, fn] of beats) {
    await sleep(ms)
    if (!alive()) return
    fn()
  }
  while (pages.value < 38) {
    await sleep(45)
    if (!alive()) return
    pages.value++
  }
  await sleep(400)
  stage.value = 6
  for (let i = 0; i < rows.length; i++) {
    await sleep(320)
    if (!alive()) return
    shownRows.value = i + 1
  }
}

watch([stage, shownRows], async () => {
  await nextTick()
  thread.value?.scrollTo({ top: thread.value.scrollHeight, behavior: 'smooth' })
})

onMounted(() => {
  const io = new IntersectionObserver(([e]) => {
    if (!e?.isIntersecting) return
    play()
    io.disconnect()
  }, { threshold: 0.35 })
  io.observe(root.value!)
  onBeforeUnmount(() => { io.disconnect(); runId++ })
})
</script>

<template>
  <section id="demo" ref="root" class="relative py-28 sm:py-36">
    <div class="mx-auto grid max-w-7xl gap-14 px-4 sm:px-8 lg:grid-cols-[.8fr_1.2fr] lg:gap-16">
      <div class="lg:sticky lg:top-28 lg:self-start">
        <p v-reveal class="eyebrow">Inside a Task</p>
        <h2 v-reveal="100" class="mt-4 font-display text-5xl leading-[.95] sm:text-6xl">
          Talk to it like a <em class="text-ember">colleague</em>.
        </h2>
        <p v-reveal="200" class="mt-6 text-cream/75">
          Sokosumi Tasks have no buttons, so Reach asks with numbered choices. Answer “2” or in plain words —
          both work. Then it hunts, verifies and reports.
        </p>
        <ul v-reveal="300" class="mt-8 space-y-3 text-sm text-cream/70">
          <li class="flex items-center gap-3"><span class="rounded border px-1.5 py-0.5 font-mono text-[10px]" :class="badge.new">2026-08</span> signal from the last 12 months</li>
          <li class="flex items-center gap-3"><span class="rounded border px-1.5 py-0.5 font-mono text-[10px]" :class="badge.old">2025-07</span> older — flagged, not hidden</li>
          <li class="flex items-center gap-3"><span class="rounded border px-1.5 py-0.5 font-mono text-[10px]" :class="badge.none">undated</span> never presented as current</li>
        </ul>
        <button v-reveal="400" class="btn-ghost mt-10" @click="play">↻ Replay</button>
      </div>

      <div v-reveal="150" class="frame bg-ink/70 backdrop-blur">
        <div class="flex items-center justify-between border-b border-cream/15 px-4 py-3">
          <div class="flex items-center gap-1.5">
            <span v-for="n in 3" :key="n" class="size-2.5 rounded-full bg-cream/25" />
          </div>
          <span class="font-mono text-[11px] text-cream/60">Task · Reach</span>
          <span class="rounded-full px-2.5 py-0.5 font-mono text-[10px] transition-colors duration-500" :class="status.cls">{{ status.label }}</span>
        </div>

        <div ref="thread" class="h-[560px] space-y-4 overflow-y-auto p-4 sm:p-6 [scrollbar-width:thin]">
          <p v-if="stage === 0" class="pt-40 text-center font-mono text-xs text-cream/40">waiting for a Task…</p>

          <div v-if="stage >= 1" class="ml-auto max-w-[85%] rounded-2xl rounded-br-sm bg-cream px-4 py-3 text-sm text-ultra">
            {{ typed }}<span v-if="stage === 1" class="ml-0.5 inline-block h-4 w-px translate-y-0.5 bg-ultra animate-pulse" />
          </div>

          <TransitionGroup enter-from-class="opacity-0 translate-y-3" enter-active-class="transition duration-500">
            <div v-if="stage >= 2" key="q" class="max-w-[90%] rounded-2xl rounded-bl-sm border border-cream/15 bg-ultra/60 px-4 py-3 text-sm">
              <p>Ok, I'm off hunting <b>EN 9100 titanium fastener makers</b> in Europe. One thing first:</p>
              <p class="mt-2">1️⃣ Prototypes (&lt; 100 pcs)<br>2️⃣ Small series (100–5,000 pcs)</p>
              <p class="mt-2 text-cream/60">Reply <code class="font-mono">1</code> or <code class="font-mono">2</code>.</p>
            </div>

            <div v-if="stage >= 3" key="a" class="ml-auto w-fit rounded-2xl rounded-br-sm bg-cream px-4 py-2 text-sm text-ultra">2</div>

            <div v-if="stage >= 4" key="e" class="flex items-center gap-2 font-mono text-[11px] text-cream/70">
              <span class="size-1.5 rounded-full bg-emerald-300" /> Escrow funded · 1 USDM · Cardano Preprod
            </div>

            <div v-if="stage >= 5" key="h" class="font-mono text-[11px] text-cream/70">
              <div class="flex items-center gap-2">
                <span class="size-1.5 rounded-full bg-ember" :class="stage === 5 && 'animate-ping'" />
                Hunting… {{ pages }} pages read · {{ Math.min(12, Math.floor(pages / 3)) }} candidates
              </div>
              <div class="mt-2 h-px w-full overflow-hidden bg-cream/15">
                <div class="h-full bg-ember transition-[width] duration-200" :style="{ width: `${(pages / 38) * 100}%` }" />
              </div>
            </div>

            <article v-if="stage >= 6" key="r" class="rounded-xl border border-cream/20 bg-ultra-deep/70 p-4 sm:p-5">
              <h4 class="font-display text-2xl leading-tight">🎯 7 EN 9100 titanium fastener suppliers — Europe</h4>
              <p class="mt-2 text-sm text-cream/85"><b>Verdict:</b> start with Company A — small series, EN 9100 verified, lead time announced.</p>
              <p class="mt-1 text-xs text-cream/55">Brief: sourcing · aero · titanium fasteners · small series · Europe</p>

              <div class="mt-4 overflow-x-auto">
                <table class="w-full min-w-[520px] text-left text-xs">
                  <thead class="font-mono text-[10px] uppercase tracking-wider text-cream/50">
                    <tr><th class="py-2 pr-2">#</th><th class="pr-2">Company</th><th class="pr-2">Why</th><th class="pr-2">Proof</th><th class="pr-2">Fresh</th><th>Score</th></tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="(r, i) in rows" :key="r.co"
                      class="border-t border-cream/10 transition duration-500"
                      :class="i < shownRows ? 'opacity-100' : 'opacity-0 translate-x-2'"
                    >
                      <td class="py-2.5 pr-2 font-mono text-cream/50">{{ i + 1 }}</td>
                      <td class="pr-2 whitespace-nowrap">{{ r.co }} <span class="text-cream/50">{{ r.cc }}</span></td>
                      <td class="pr-2 text-cream/75">{{ r.why }}</td>
                      <td class="pr-2"><span class="underline decoration-ember underline-offset-2">{{ r.proof }}</span></td>
                      <td class="pr-2"><span class="rounded border px-1.5 py-0.5 font-mono text-[10px]" :class="badge[r.fresh]">{{ r.date }}</span></td>
                      <td class="w-20">
                        <div class="flex items-center gap-2">
                          <div class="h-1 flex-1 bg-cream/10"><div class="h-full bg-cream transition-[width] duration-1000" :style="{ width: i < shownRows ? `${r.score}%` : '0%' }" /></div>
                          <span class="font-mono">{{ r.score }}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <p class="mt-4 text-xs text-cream/70"><b>✉️ First message</b> — ready to copy · <b>⚠️ Watch-outs</b> · <b>🔍 Not found</b></p>
              <p class="mt-3 font-mono text-[10px] text-cream/40">Illustrative output · company names anonymised</p>
            </article>
          </TransitionGroup>
        </div>
      </div>
    </div>
  </section>
</template>
