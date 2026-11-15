<script setup lang="ts">
import { ref, useId } from 'vue';
import { parseCssColor, COLOR_ERROR } from '../../lib/color';
import { addShade, paletteId, type PaletteColor } from '../../lib/palette';
import ColorInput from '../ColorInput.vue';
import type { EditorContext } from './context';

const props = defineProps<{ ctx: EditorContext; color: PaletteColor }>();
const emit = defineEmits<{ added: [] }>();

const name = ref('');
const value = ref('');
const error = ref<string>();

function nameProblem(id: string) {
  if (!id) return 'Give the shade a name.';
  if (props.color.shades.some((shade) => shade.name === id))
    return `${id} is already taken.`;
}

function add() {
  const id = paletteId(name.value);
  const color = parseCssColor(value.value.trim());
  error.value = nameProblem(id) ?? (color ? undefined : COLOR_ERROR);
  if (error.value || !color) return;
  props.ctx.edit((doc) =>
    addShade(
      doc,
      { color: props.color.id, shade: id },
      color,
      props.ctx.vendor,
    ),
  );
  name.value = '';
  value.value = '';
  emit('added');
}
const uid = useId();
</script>

<template>
  <form class="cd-field-row" @submit.prevent="add">
    <label :for="`${uid}-name`" class="cd-field"
      ><span>New shade name</span>
      <input
        :id="`${uid}-name`"
        v-model="name"
        type="text"
        placeholder="light"
      />
    </label>
    <ColorInput
      v-model="value"
      label="Shade color"
      placeholder="any CSS color"
      :error="error"
    />
    <button type="submit" class="btn btn-small">Add shade</button>
  </form>
</template>
