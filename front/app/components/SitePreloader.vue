<script setup lang="ts">
const TEXT = 'welcome to reach'
const delays = [...TEXT].map(() => Math.round(Math.random() * 600))
const gone = ref(false)

onMounted(() => {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches
  setTimeout(() => {
    gone.value = true
    document.documentElement.classList.add('is-loaded')
    window.dispatchEvent(new Event('reach:loaded'))
  }, reduce ? 0 : 1500)
})
</script>

<template>
  <div
    class="preloader fixed inset-0 z-[100] grid place-items-center bg-night transition-[opacity,visibility] duration-700"
    :class="gone && 'invisible opacity-0'" aria-hidden="true"
  >
    <p class="label chars is-in text-cream">
      <span v-for="(c, i) in TEXT" :key="i" class="ch" :style="{ '--cd': `${delays[i]}ms` }">{{ c === ' ' ? ' ' : c }}</span>
      <span class="cursor" />
    </p>
  </div>
</template>
