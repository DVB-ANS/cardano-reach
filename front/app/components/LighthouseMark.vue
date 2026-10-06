<template>
  <svg viewBox="0 0 32 32" aria-hidden="true" class="overflow-visible">
    <path d="M19.5 11.5 31 6.5v10z" class="fill-ember/90 origin-[19px_12px] animate-[beam_4s_ease-in-out_infinite]" />
    <path d="M13 27h6l-1-13h-4z" fill="currentColor" />
    <rect x="12.5" y="10" width="7" height="4" fill="currentColor" />
    <path d="M13 10l3-3 3 3z" fill="currentColor" />
    <path d="M7 27.5h18" stroke="currentColor" stroke-width="1.4" />
  </svg>
</template>

<style scoped>
@keyframes beam {
  0%, 100% { transform: rotate(-8deg); opacity: .7; }
  50% { transform: rotate(10deg); opacity: 1; }
}
</style>
