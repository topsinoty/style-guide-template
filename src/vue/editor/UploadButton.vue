<script setup lang="ts">
import { useFileDialog } from '@vueuse/core';

defineProps<{ label: string; accept?: string }>();
const emit = defineEmits<{ files: [files: File[]] }>();
const { open, onChange } = useFileDialog({ reset: true });
onChange((files) => files && emit('files', [...files]));
</script>

<template>
  <div>
    <button
      type="button"
      class="btn btn-secondary btn-small"
      @click="open({ accept })"
    >
      {{ label }}
    </button>
  </div>
</template>
