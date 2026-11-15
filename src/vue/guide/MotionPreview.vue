<script setup lang="ts">
import { computed, ref } from 'vue';

const props = defineProps<{ name: string; type: string }>();
const moved = ref(false);
const style = computed(() =>
  props.type === 'duration'
    ? { transitionDuration: `var(${props.name})` }
    : {
        transitionDuration: '600ms',
        transitionTimingFunction: `var(${props.name})`,
      },
);
</script>

<template>
  <button
    type="button"
    class="cd-motion"
    :aria-pressed="moved"
    :aria-label="`Play ${name}`"
    title="Play"
    @click="moved = !moved"
  >
    <span class="cd-motion-dot" :style="style"></span>
  </button>
</template>
