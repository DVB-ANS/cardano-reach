<script setup lang="ts">
/*
 * Animated overlay drawn on top of the hero illustration: a rotating stippled vortex,
 * expanding ripples around the lighthouse and a pulsing lamp. Anchors are fractions of
 * the source image, remapped through the same `object-fit: cover` math as the <img>.
 */
const props = defineProps<{
  imgW: number
  imgH: number
  vortex: [number, number]
  lamp: [number, number]
  base: [number, number]
}>()

const el = ref<HTMLCanvasElement>()

onMounted(() => {
  const c = el.value!
  const ctx = c.getContext('2d')!
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  const CREAM = '240,228,200'

  let w = 0, h = 0, s = 1, ox = 0, oy = 0, raf = 0, visible = true
  let parts: { r: number, a: number, len: number, tier: number }[] = []
  let stars: { x: number, y: number, p: number, sz: number }[] = []

  const map = ([fx, fy]: [number, number]) => [ox + fx * props.imgW * s, oy + fy * props.imgH * s] as const

  function seed() {
    const R = 0.27 * props.imgW * s
    const n = Math.round(Math.min(1500, (w * h) / 700))
    parts = Array.from({ length: n }, (_, i) => {
      const r = R * Math.pow(Math.random(), 0.7) + 6
      return {
        r,
        a: (i % 3) * 2.094 + Math.log(r / 6) * 1.5 + (Math.random() - 0.5) * 0.7,
        len: 0.04 + Math.random() * 0.16,
        tier: Math.floor(Math.random() * 3),
      }
    })
    const horizon = map(props.base)[1]
    stars = Array.from({ length: Math.round(w / 14) }, () => ({
      x: Math.random() * w,
      y: Math.random() * horizon * 0.95,
      p: Math.random() * Math.PI * 2,
      sz: Math.random() * 1.4 + 0.4,
    }))
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio, 2)
    w = c.clientWidth
    h = c.clientHeight
    c.width = w * dpr
    c.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    s = Math.max(w / props.imgW, h / props.imgH)
    ox = (w - props.imgW * s) / 2
    oy = (h - props.imgH * s) / 2
    seed()
    if (reduce) draw(0)
  }

  function draw(t: number) {
    ctx.clearRect(0, 0, w, h)

    for (const st of stars) {
      ctx.fillStyle = `rgba(${CREAM},${0.25 + 0.6 * Math.abs(Math.sin(t * 0.0012 + st.p))})`
      ctx.fillRect(st.x, st.y, st.sz, st.sz)
    }

    const [vx, vy] = map(props.vortex)
    const rot = -t * 0.00009
    ctx.lineCap = 'round'
    for (let tier = 0; tier < 3; tier++) {
      ctx.beginPath()
      ctx.strokeStyle = `rgba(${CREAM},${[0.16, 0.32, 0.55][tier]})`
      ctx.lineWidth = [0.8, 1.1, 1.4][tier]!
      for (const p of parts) {
        if (p.tier !== tier) continue
        const a = p.a + rot * (1 + 18 / (p.r + 30))
        ctx.moveTo(vx + Math.cos(a) * p.r, vy + Math.sin(a) * p.r * 0.78)
        ctx.lineTo(vx + Math.cos(a + p.len) * p.r, vy + Math.sin(a + p.len) * p.r * 0.78)
      }
      ctx.stroke()
    }

    const [bx, by] = map(props.base)
    const unit = props.imgW * s
    ctx.setLineDash([2, 7])
    for (let k = 0; k < 5; k++) {
      const phase = ((t * 0.00005 + k / 5) % 1)
      const rx = unit * (0.05 + phase * 0.45)
      ctx.beginPath()
      ctx.strokeStyle = `rgba(${CREAM},${0.5 * (1 - phase)})`
      ctx.lineWidth = 1.2
      ctx.lineDashOffset = -t * 0.01
      ctx.ellipse(bx, by, rx, rx * 0.1, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
    ctx.setLineDash([])

    const [lx, ly] = map(props.lamp)
    const gr = unit * 0.035 * (1 + 0.25 * Math.sin(t * 0.0025))
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, gr)
    g.addColorStop(0, `rgba(${CREAM},0.9)`)
    g.addColorStop(1, `rgba(${CREAM},0)`)
    ctx.fillStyle = g
    ctx.beginPath()
    ctx.arc(lx, ly, gr, 0, Math.PI * 2)
    ctx.fill()
  }

  const loop = (t: number) => {
    draw(t)
    raf = requestAnimationFrame(loop)
  }
  const start = () => { if (!reduce && visible && !raf) raf = requestAnimationFrame(loop) }
  const stop = () => { cancelAnimationFrame(raf); raf = 0 }

  const ro = new ResizeObserver(resize)
  ro.observe(c)
  const io = new IntersectionObserver(([e]) => {
    visible = !!e?.isIntersecting
    visible ? start() : stop()
  })
  io.observe(c)
  const onVis = () => (document.hidden ? stop() : start())
  document.addEventListener('visibilitychange', onVis)

  onBeforeUnmount(() => {
    stop()
    ro.disconnect()
    io.disconnect()
    document.removeEventListener('visibilitychange', onVis)
  })
})
</script>

<template>
  <canvas ref="el" class="pointer-events-none absolute inset-0 size-full mix-blend-screen" aria-hidden="true" />
</template>
