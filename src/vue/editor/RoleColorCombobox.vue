<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  ComboboxAnchor,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxViewport,
} from 'reka-ui';
import { parseCssColor } from '../../lib/color.js';
import { optionFor, type ColorOption } from './role-color.js';

const props = defineProps<{ label: string; text: string; hex: string; options: ColorOption[] }>();
const emit = defineEmits<{ commit: [text: string] }>();

const search = ref(props.text);
const picked = ref(props.hex);

watch(
  () => props.text,
  (text) => (search.value = text),
);
watch(
  () => props.hex,
  (hex) => (picked.value = hex),
);

const query = computed(() => (search.value === props.text ? '' : search.value.trim()));

const matches = computed(() =>
  props.options.filter((option) => option.label.toLowerCase().includes(query.value.toLowerCase())),
);

const custom = computed(() => {
  const typed = query.value;
  if (!typed || optionFor(typed, props.options) || !parseCssColor(typed)) return null;
  return typed;
});

function choose(value: unknown) {
  if (typeof value === 'string') emit('commit', value);
  search.value = props.text;
}
</script>

<template>
  <ComboboxRoot
    class="cd-role-color"
    :ignore-filter="true"
    :open-on-focus="true"
    :open-on-click="true"
    @update:model-value="choose"
  >
    <input
      v-model="picked"
      type="color"
      class="cd-role-swatch"
      :aria-label="`Pick a custom ${label} color`"
      @change="emit('commit', picked)"
    />
    <ComboboxAnchor class="cd-combobox-anchor">
      <ComboboxInput
        v-model="search"
        class="cd-combobox-input"
        :display-value="() => text"
        :aria-label="label"
        placeholder="Search shades or type a CSS color"
        @blur="search = text"
      />
    </ComboboxAnchor>
    <ComboboxPortal>
      <ComboboxContent position="popper" :side-offset="4" :collision-padding="8" class="cd-combobox-popup">
        <ComboboxViewport>
          <ComboboxItem v-if="custom" :value="custom" :text-value="custom" class="cd-listbox-option">
            <span class="cd-combobox-option-swatch" aria-hidden="true" :style="{ background: custom }"></span>
            <span>Use {{ custom }} as a custom color</span>
          </ComboboxItem>
          <ComboboxItem
            v-for="option in matches"
            :key="option.value"
            :value="option.value"
            :text-value="option.label"
            class="cd-listbox-option"
          >
            <span
              class="cd-combobox-option-swatch"
              aria-hidden="true"
              :style="{ background: option.swatch }"
            ></span>
            <span>{{ option.label }}</span>
          </ComboboxItem>
        </ComboboxViewport>
        <ComboboxEmpty class="cd-combobox-empty">No shade matches. Type a CSS color to use it.</ComboboxEmpty>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
