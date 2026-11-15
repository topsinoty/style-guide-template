<script setup lang="ts">
import Listbox, { type ListboxOption } from '../Listbox.vue';

defineProps<{ label: string; options: ListboxOption[]; placeholder?: string }>();
const value = defineModel<string>('value', { required: true });
</script>

<template>
  <div class="cd-field">
    <span aria-hidden="true">{{ label }}</span>
    <Listbox v-model:value="value" :label="label" :options="options" :placeholder="placeholder" />
  </div>
</template>
