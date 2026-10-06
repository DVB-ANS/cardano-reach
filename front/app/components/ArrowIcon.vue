<script setup lang="ts">
const props = withDefaults(defineProps<{ dir?: 'ext' | 'down' | 'right' | 'left' }>(), { dir: 'ext' })
const rotate = { ext: 0, right: 45, down: 135, left: 225 }
</script>

<template>
  <svg viewBox="0 0 12 12" class="size-3" aria-hidden="true">
    <rect v-if="props.dir === 'ext'" x="1" y="3" width="8" height="8" fill="none" stroke="currentColor" stroke-width="1.2" />
    <g :transform="`rotate(${rotate[props.dir]} 6 6)`">
      <path d="M4 8 10 2M5.5 2H10v4.5" fill="none" stroke="currentColor" stroke-width="1.2" :transform="props.dir === 'ext' ? '' : 'translate(-1.2 1.2)'" />
    </g>
  </svg>
</template>
