<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import {
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxPortal,
  ComboboxRoot,
  ComboboxTrigger,
  ComboboxViewport,
} from 'reka-ui';
import Icon from '../Icon.vue';
import type { ColorOption } from './role-color.js';

const props = defineProps<{ label: string; text: string; options: ColorOption[]; swatch: string }>();
const emit = defineEmits<{ commit: [text: string] }>();

const search = ref(props.text);
const open = ref(false);

watch(
  () => props.text,
  (text) => (search.value = text),
);

const matches = computed(() => {
  const query = search.value.trim().toLowerCase();
  return props.options.filter((option) => option.label.toLowerCase().includes(query));
});

function commitTyped() {
  const typed = search.value;
  search.value = props.text;
  if (typed.trim() !== props.text) emit('commit', typed);
}

function choose(value: unknown) {
  const option = props.options.find((item) => item.value === value);
  if (option) emit('commit', option.value);
  open.value = false;
}

function enter() {
  if (matches.value.length) return;
  commitTyped();
  open.value = false;
}
</script>

<template>
  <ComboboxRoot
    v-model:open="open"
    class="cd-role-color"
    :ignore-filter="true"
    :open-on-click="true"
    @update:model-value="choose"
  >
    <span class="cd-role-swatch" aria-hidden="true" :style="{ background: swatch }"></span>
    <ComboboxInput
      v-model="search"
      class="cd-combobox-input"
      :display-value="() => text"
      :aria-label="label"
      placeholder="Palette shade or any CSS color"
      @blur="commitTyped"
      @keydown.enter="enter"
    />
    <ComboboxTrigger class="cd-combobox-trigger" :aria-label="`Show ${label} choices`">
      <Icon name="chevron" />
    </ComboboxTrigger>
    <ComboboxPortal>
      <ComboboxContent position="popper" :side-offset="4" :collision-padding="8" class="cd-combobox-popup">
        <ComboboxEmpty class="cd-combobox-empty"
          >No palette match. Press Enter to use it as a color.</ComboboxEmpty
        >
        <ComboboxViewport>
          <ComboboxItem
            v-for="option in matches"
            :key="option.value"
            :value="option.value"
            :text-value="option.label"
            class="cd-listbox-option"
          >
            <span
              class="cd-role-swatch cd-combobox-option-swatch"
              aria-hidden="true"
              :style="{ background: option.swatch }"
            ></span>
            <span>{{ option.label }}</span>
          </ComboboxItem>
        </ComboboxViewport>
      </ComboboxContent>
    </ComboboxPortal>
  </ComboboxRoot>
</template>
