<script setup lang="ts">
import Icon, { type IconName } from '../Icon.vue';

defineProps<{
  name: IconName;
  label: string;
  disabled?: boolean;
  title?: string;
}>();
defineEmits<{ click: [] }>();
</script>

<template>
  <button
    type="button"
    class="cd-action"
    :aria-label="label"
    :title="title ?? label"
    :disabled="disabled"
    @click="$emit('click')"
  >
    <Icon :name="name" />
  </button>
</template>
