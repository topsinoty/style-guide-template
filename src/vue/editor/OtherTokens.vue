<script setup lang="ts">
import { computed, ref } from 'vue';
import { toHex } from '../../lib/color.js';
import { cssName } from '../../lib/css.js';
import * as E from '../../lib/edit.js';
import { paletteColors } from '../../lib/palette.js';
import { narrow, isColor } from '../../lib/values.js';
import { COLOR_ERROR } from '../ColorInput.vue';
import { isOtherColor, isOtherToken } from '../guide/sections.js';
import Choice from './Choice.vue';
import type { EditorContext } from './context.js';
import IconButton from './IconButton.vue';
import NumberField from './NumberField.vue';
import { NEW_TOKEN_TYPES, UNITS, tokenValue, valueExample } from './other-tokens.js';
import { colorOptions, roleEntry, roleText } from './role-color.js';
import RoleColorCombobox from './RoleColorCombobox.vue';
import TextField from './TextField.vue';

const props = defineProps<{ ctx: EditorContext }>();

const shades = computed(() => colorOptions(paletteColors(props.ctx.doc, props.ctx.vendor)));

const isMeasure = (value: unknown): value is { value: number; unit: string } =>
  typeof value === 'object' &&
  value !== null &&
  'value' in value &&
  typeof value.value === 'number' &&
  'unit' in value &&
  typeof value.unit === 'string';

const rows = computed(() =>
  [...props.ctx.tokens]
    .filter(([path, token]) => isOtherColor(path, token.type ?? '') || isOtherToken(path))
    .map(([path, token]) => ({
      path,
      label: cssName(path),
      type: token.type ?? '',
      value: token.value,
      resolved: token.resolved,
    })),
);

const setValue = (path: string, type: string, value: unknown) =>
  props.ctx.setToken(path, { ...props.ctx.fresh(path), $type: type, $value: value });

function setColor(path: string, text: string) {
  const value = roleEntry(text, shades.value);
  if (!value) return props.ctx.session.warn(`${text.trim() || 'That'}: ${COLOR_ERROR}`);
  setValue(path, 'color', value);
}

function setJson(path: string, type: string, text: string) {
  try {
    setValue(path, type, JSON.parse(text));
  } catch {
    props.ctx.session.warn(`${cssName(path)}: the value is not valid JSON.`);
  }
}

const hexOf = (resolved: unknown) => {
  const color = narrow(resolved, isColor);
  return color ? toHex(color) : '#000000';
};

const newName = ref('');
const newType = ref('duration');
const newValue = ref('');
const error = ref<string>();

function nameProblem(path: string) {
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*$/.test(path))
    return 'Use lowercase words joined by dots, like duration.slow.';
  if (props.ctx.tokens.has(path)) return `${path} already exists.`;
  return undefined;
}

function add() {
  const path = newName.value.trim().toLowerCase();
  const value = tokenValue(newType.value, newValue.value);
  error.value =
    nameProblem(path) ??
    (value === null ? `That is not a ${newType.value}. Try ${valueExample(newType.value)}.` : undefined);
  if (error.value) return;
  setValue(path, newType.value, value);
  newName.value = '';
  newValue.value = '';
}
</script>

<template>
  <div v-for="row in rows" :key="row.path" class="cd-field-row">
    <div v-if="row.type === 'color' && typeof row.value !== 'number'" class="cd-field">
      <span>{{ row.label }}</span>
      <RoleColorCombobox
        :label="row.label"
        :text="roleText(row.value, shades)"
        :hex="hexOf(row.resolved)"
        :options="shades"
        @commit="setColor(row.path, $event)"
      />
    </div>
    <TextField
      v-else-if="typeof row.value === 'string'"
      :label="row.label"
      :value="row.value"
      @commit="setValue(row.path, row.type, $event)"
    />
    <NumberField
      v-else-if="typeof row.value === 'number'"
      :label="row.label"
      :value="row.value"
      @commit="setValue(row.path, row.type, $event)"
    />
    <template v-else-if="isMeasure(row.value) && UNITS[row.type]">
      <NumberField
        :label="row.label"
        :value="row.value.value"
        @commit="ctx.patchValue(row.path, { value: $event })"
      />
      <Choice
        label="Unit"
        :options="UNITS[row.type].map((unit) => ({ value: unit, label: unit }))"
        :value="row.value.unit"
        @update:value="ctx.patchValue(row.path, { unit: $event })"
      />
    </template>
    <TextField
      v-else
      :label="`${row.label} (JSON)`"
      :value="JSON.stringify(row.value)"
      @commit="setJson(row.path, row.type, $event)"
    />
    <IconButton
      name="trash"
      :label="`Remove ${row.label}`"
      @click="ctx.edit((doc) => E.removeToken(doc, row.path))"
    />
  </div>
  <p v-if="!rows.length" class="cd-hint">No other tokens yet. Add one below.</p>
  <form @submit.prevent="add">
    <h4>Add a token</h4>
    <div class="cd-field-row">
      <label class="cd-field"
        ><span>Name</span><input v-model="newName" type="text" placeholder="duration.slow"
      /></label>
      <Choice v-model:value="newType" label="Type" :options="NEW_TOKEN_TYPES" />
    </div>
    <div class="cd-field-row">
      <label class="cd-field"
        ><span>Value</span
        ><input
          v-model="newValue"
          type="text"
          :placeholder="valueExample(newType)"
          :aria-invalid="error ? 'true' : undefined"
          :aria-describedby="error ? 'cd-add-token-error' : undefined"
      /></label>
      <button type="submit" class="btn btn-small">Add token</button>
    </div>
    <p v-if="error" id="cd-add-token-error" class="cd-error" role="alert">{{ error }}</p>
  </form>
</template>
