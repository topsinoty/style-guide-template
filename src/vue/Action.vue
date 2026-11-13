<script setup lang="ts">
import Icon, { type IconName } from './Icon.vue';

defineProps<{
  id: string;
  icon: IconName;
  label: string;
  title: string;
  busy?: boolean;
}>();
defineEmits<{ click: [] }>();
</script>

<template>
  <button
    :id="id"
    type="button"
    class="cd-action"
    :title="title"
    :aria-busy="busy ? 'true' : undefined"
    :disabled="busy || undefined"
    @click="$emit('click')"
  >
    <Icon :name="icon" /><span class="cd-action-label">{{ label }}</span>
  </button>
</template>
