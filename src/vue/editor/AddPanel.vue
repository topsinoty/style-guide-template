<script setup lang="ts">
import { nextTick, ref, useTemplateRef } from 'vue';
import { onKeyStroke } from '@vueuse/core';
import Icon from '../Icon.vue';

// Adding is occasional: show one quiet button until the form is wanted.
defineProps<{ label: string }>();
const open = ref(false);
const panel = useTemplateRef<HTMLElement>('panel');
const trigger = useTemplateRef<HTMLButtonElement>('trigger');

async function show() {
  open.value = true;
  await nextTick();
  panel.value?.querySelector<HTMLElement>('input, textarea, button')?.focus();
}

async function close() {
  open.value = false;
  await nextTick();
  trigger.value?.focus();
}

onKeyStroke(
  'Escape',
  (e) => {
    e.stopPropagation();
    void close();
  },
  { target: panel },
);
</script>

<template>
  <button
    v-if="!open"
    ref="trigger"
    type="button"
    class="btn btn-secondary btn-quiet ed-add-trigger"
    @click="show"
  >
    <Icon name="plus" /> {{ label }}
  </button>
  <div v-else ref="panel" class="ed-add-panel">
    <slot :close="close" />
  </div>
</template>
