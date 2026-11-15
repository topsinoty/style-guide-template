<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number | string;
    /** Clearing the field commits NaN instead of being ignored. */
    optional?: boolean;
  }>(),
  { step: 'any' },
);
const emit = defineEmits<{ commit: [value: number] }>();
const number = computed<number | ''>({
  get: () => props.value ?? '',
  set: (value) => {
    if (value === '' && props.optional) emit('commit', Number.NaN);
    else if (value !== '' && Number.isFinite(value)) emit('commit', value);
  },
});
</script>

<template>
  <label class="cd-field"
    ><span>{{ label }}</span>
    <input v-model.lazy="number" type="number" :min="min" :max="max" :step="step" />
  </label>
</template>
