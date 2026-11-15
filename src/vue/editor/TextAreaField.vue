<script setup lang="ts">
import { onBeforeUnmount, ref, watch, type CSSProperties, useId } from 'vue';
import { useDebounceFn } from '@vueuse/core';

const props = defineProps<{
  label: string;
  value?: string;
  placeholder?: string;
  hint?: string;
  rows?: number;
  preview?: CSSProperties;
}>();
const emit = defineEmits<{ commit: [value: string, key: string] }>();
const key = `textarea-${crypto.randomUUID()}`;
const draft = ref('');
const focused = ref(false);

// While typing, the field keeps its own text so trimming never eats the space just typed.
watch(
  () => props.value,
  (value) => {
    if (!focused.value) draft.value = value ?? '';
  },
  { immediate: true },
);

const send = () => {
  if (draft.value.trim() !== (props.value ?? ''))
    emit('commit', draft.value.trim(), key);
};
const sendSoon = useDebounceFn(send, 250);

function done() {
  focused.value = false;
  send();
  draft.value = draft.value.trim();
}

// Switching tabs or closing a row unmounts the field; keep the last keystrokes.
onBeforeUnmount(send);
const uid = useId();
</script>

<template>
  <label :for="uid" class="cd-field"
    ><span>{{ label }}</span>
    <textarea
      :id="uid"
      v-model="draft"
      :rows="rows ?? 4"
      :placeholder="placeholder"
      :style="preview"
      @focus="focused = true"
      @input="sendSoon"
      @blur="done"
    ></textarea>
    <span v-if="hint" class="cd-hint">{{ hint }}</span>
  </label>
</template>
