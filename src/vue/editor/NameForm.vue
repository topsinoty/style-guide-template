<script setup lang="ts">
import { ref } from 'vue';
import { paletteId } from '../../lib/palette.js';
import AddPanel from './AddPanel.vue';

const props = defineProps<{
  label: string;
  action: string;
  taken: string[];
  placeholder?: string;
  inputId?: string;
  check?: () => string | undefined;
}>();
const emit = defineEmits<{ add: [name: string] }>();

const name = ref('');
const error = ref<string>();
const errorId = `cd-name-error-${crypto.randomUUID()}`;

function problem(id: string) {
  if (!id) return 'Give it a name.';
  if (props.taken.includes(id)) return `${id} is already taken.`;
  return props.check?.();
}

function add(close: () => void) {
  const id = paletteId(name.value);
  error.value = problem(id);
  if (error.value) return;
  emit('add', id);
  name.value = '';
  close();
}
</script>

<template>
  <AddPanel :label="action">
    <template #default="{ close }">
      <form class="ed-add" @submit.prevent="add(close)">
        <label class="cd-field"
          ><span>{{ label }}</span>
          <input
            :id="inputId"
            v-model="name"
            type="text"
            :placeholder="placeholder && `e.g. ${placeholder}`"
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error ? errorId : undefined"
        /></label>
        <slot />
        <button type="submit" class="btn">{{ action }}</button>
        <button type="button" class="btn btn-secondary btn-quiet" @click="close">Cancel</button>
        <p v-if="error" :id="errorId" class="cd-error" role="alert">{{ error }}</p>
      </form>
    </template>
  </AddPanel>
</template>
