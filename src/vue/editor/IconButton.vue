<script setup lang="ts">
import Icon, { type IconName } from '../Icon.vue';

defineProps<{ name: IconName; label: string }>();
defineEmits<{ click: [] }>();
</script>

<template>
  <button type="button" class="cd-action" :aria-label="label" :title="label" @click="$emit('click')">
    <Icon :name="name" />
  </button>
</template>
