<script setup lang="ts">
import { computed, useId } from 'vue';

const props = withDefaults(
  defineProps<{
    label: string;
    value?: number;
    min?: number;
    max?: number;
    step?: number | string;
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
const uid = useId();
</script>

<template>
  <label :for="uid" class="cd-field"
    ><span>{{ label }}</span>
    <input
      :id="uid"
      v-model.lazy="number"
      type="number"
      :min="min"
      :max="max"
      :step="step"
    />
  </label>
</template>
