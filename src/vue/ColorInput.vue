<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { COLOR_ERROR, parseCssColor, toHex } from '~/lib';
import type { DtcgColor } from '~/lib';

const props = withDefaults(
  defineProps<{
    label: string;
    placeholder?: string;
    picker?: boolean;
    error?: string;
  }>(),
  { picker: true },
);
const emit = defineEmits<{ commit: [color: DtcgColor] }>();
const text = defineModel<string>({ default: '' });
const invalid = ref(false);
const errorId = `cd-color-error-${crypto.randomUUID()}`;
const error = computed(() => (invalid.value ? COLOR_ERROR : props.error));
const hex = computed({
  get: () => {
    const color = parseCssColor(text.value);

    return color ? toHex(color) : '#000000';
  },
  set: (value) => (text.value = value),
});

function commit() {
  const color = parseCssColor(text.value.trim());

  invalid.value = !color;
  if (color) {
    emit('commit', color);
  }
}

const uid = useId();
</script>

<template>
  <label :for="uid" class="cd-field">
    <span>{{ label }}</span>
    <span class="cd-color-input">
      <input
        :id="uid"
        v-model="text"
        type="text"
        :placeholder="placeholder"
        :aria-invalid="error ? 'true' : undefined"
        :aria-describedby="error ? errorId : undefined"
        @input="invalid = false"
        @change="commit"
      />
      <label v-if="picker" :for="`${uid}-pick`" class="cd-sr-only"
        >Pick {{ label }}</label
      >
      <input
        v-if="picker"
        :id="`${uid}-pick`"
        v-model="hex"
        type="color"
        @change="commit"
      />
    </span>
    <span v-if="error" :id="errorId" class="cd-error">{{ error }}</span>
  </label>
</template>
