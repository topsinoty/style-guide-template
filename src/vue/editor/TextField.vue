<script setup lang="ts">
import { computed, type CSSProperties, useId } from 'vue';

const props = defineProps<{
  label: string;
  value?: string;
  placeholder?: string;
  hint?: string;
  inputId?: string;
  preview?: CSSProperties;
}>();
const emit = defineEmits<{ commit: [value: string] }>();
const text = computed({
  get: () => props.value ?? '',
  set: (value) => emit('commit', value),
});
const uid = useId();
</script>

<template>
  <label :for="inputId ?? uid" class="cd-field"
    ><span>{{ label }}</span>
    <input
      :id="inputId ?? uid"
      v-model.lazy.trim="text"
      type="text"
      :placeholder="placeholder"
      :style="preview"
    />
    <span v-if="hint" class="cd-hint">{{ hint }}</span>
  </label>
</template>
