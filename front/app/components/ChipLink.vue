<script setup lang="ts">
defineProps<{ href: string, label: string, icon?: 'ext' | 'down' | 'right' | 'left', external?: boolean }>()
</script>

<template>
  <a :href="href" class="chip-group" :target="external ? '_blank' : undefined" :rel="external ? 'noopener' : undefined">
    <span v-scramble class="chip">{{ label }}</span>
    <span class="chip-icon"><ArrowIcon :dir="icon ?? 'ext'" /></span>
  </a>
</template>
