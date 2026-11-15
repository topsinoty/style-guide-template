<script setup lang="ts">
import AddPanel from './AddPanel.vue';
import { computed, ref, useId } from 'vue';
import { toHex } from '../../lib/color';
import { cssName } from '../../lib/css';
import * as E from '../../lib/edit';
import { paletteColors } from '../../lib/palette';
import { narrow, isColor } from '../../lib/values';
import { COLOR_ERROR } from '../../lib/color';
import { isOtherColor, isOtherToken, ownEditor } from '../guide/sections';
import Choice from './Choice.vue';
import type { EditorContext } from './context';
import IconButton from './IconButton.vue';
import {
  NEW_TOKEN_TYPES,
  UNITS,
  tokenValue,
  valueExample,
} from './other-tokens';
import { colorOptions, roleEntry, roleText } from './role-color';
import RoleColorCombobox from './RoleColorCombobox.vue';
import Listbox from '../Listbox.vue';
import ThemeBar from './ThemeBar.vue';

const props = defineProps<{ ctx: EditorContext }>();

const shades = computed(() =>
  colorOptions(paletteColors(props.ctx.doc, props.ctx.vendor)),
);

const isMeasure = (value: unknown): value is { value: number; unit: string } =>
  typeof value === 'object' &&
  value !== null &&
  'value' in value &&
  typeof value.value === 'number' &&
  'unit' in value &&
  typeof value.unit === 'string';

const rows = computed(() =>
  [...props.ctx.tokens]
    .filter(
      ([path, token]) =>
        isOtherColor(path, token.type ?? '') || isOtherToken(path),
    )
    .map(([path, token]) => ({
      path,
      label: cssName(path),
      type: token.type ?? '',
      value: token.value,
      resolved: token.resolved,
    })),
);

const setValue = (path: string, type: string, value: unknown) =>
  props.ctx.setToken(path, {
    ...props.ctx.fresh(path),
    $type: type,
    $value: value,
  });

function setColor(path: string, text: string) {
  const value = roleEntry(text, shades.value);
  if (!value) {
    props.ctx.session.warn(`${text.trim() || 'That'}: ${COLOR_ERROR}`);
    return;
  }
  if (path.startsWith('color.'))
    props.ctx.edit((doc) =>
      E.setRole(doc, props.ctx.theme, path.slice('color.'.length), value),
    );
  else setValue(path, 'color', value);
}

const inputValue = (event: Event) =>
  event.target instanceof HTMLInputElement ? event.target.value.trim() : '';

function setNumber(path: string, event: Event) {
  const value = Number.parseFloat(inputValue(event));
  if (Number.isFinite(value)) props.ctx.patchValue(path, { value });
}

function setText(
  row: { path: string; type: string; value: unknown },
  event: Event,
) {
  const text = inputValue(event);
  if (typeof row.value === 'number') {
    const value = Number.parseFloat(text);
    if (Number.isFinite(value)) setValue(row.path, row.type, value);
    return;
  }
  if (typeof row.value === 'string') {
    setValue(row.path, row.type, text);
    return;
  }
  try {
    setValue(row.path, row.type, JSON.parse(text));
  } catch {
    props.ctx.session.warn(
      `${cssName(row.path)}: the value is not valid JSON.`,
    );
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
  const editor = ownEditor(path);
  if (editor)
    return `${path.split('.')[0]} tokens belong to ${editor}, not Other tokens.`;
  if (props.ctx.tokens.has(path)) return `${path} already exists.`;
}

function add() {
  const path = newName.value.trim().toLowerCase();
  const value = tokenValue(newType.value, newValue.value);
  error.value =
    nameProblem(path) ??
    (value === null
      ? `That is not a ${newType.value}. Try ${valueExample(newType.value)}.`
      : undefined);
  if (error.value) return false;
  setValue(path, newType.value, value);
  newName.value = '';
  newValue.value = '';
  return true;
}
const uid = useId();
</script>

<template>
  <p class="cd-hint">
    Tokens outside the palette, scales and type: durations, easing, extra
    colors.
  </p>
  <ThemeBar v-if="rows.some((row) => row.type === 'color')" :ctx="ctx" />
  <ul
    v-if="rows.length"
    class="ed-table ed-token-table"
    aria-label="Other tokens"
  >
    <li v-for="row in rows" :key="row.path">
      <span class="ed-table-name"
        ><code>{{ row.label }}</code
        ><span class="ed-row-meta">{{ row.type }}</span></span
      >
      <RoleColorCombobox
        v-if="row.type === 'color' && typeof row.value !== 'number'"
        :label="row.label"
        :text="roleText(row.value, shades)"
        :hex="hexOf(row.resolved)"
        :options="shades"
        @commit="setColor(row.path, $event)"
      />
      <span
        v-else-if="isMeasure(row.value) && UNITS[row.type]"
        class="ed-unit-input"
      >
        <label :for="`${uid}-${row.path}`"
          ><span class="cd-sr-only">{{ row.label }}</span
          ><input
            :id="`${uid}-${row.path}`"
            type="number"
            step="any"
            :value="row.value.value"
            @change="setNumber(row.path, $event)"
        /></label>
        <Listbox
          :label="`${row.label} unit`"
          :options="
            UNITS[row.type].map((unit) => ({ value: unit, label: unit }))
          "
          :value="row.value.unit"
          @update:value="ctx.patchValue(row.path, { unit: $event })"
        />
      </span>
      <label v-else :for="`${uid}-${row.path}`"
        ><span class="cd-sr-only">{{ row.label }}</span
        ><input
          :id="`${uid}-${row.path}`"
          :type="typeof row.value === 'number' ? 'number' : 'text'"
          step="any"
          :value="
            typeof row.value === 'string' || typeof row.value === 'number'
              ? row.value
              : JSON.stringify(row.value)
          "
          @change="setText(row, $event)"
      /></label>
      <IconButton
        name="trash"
        :label="`Remove ${row.label}`"
        @click="ctx.edit((doc) => E.removeToken(doc, row.path))"
      />
    </li>
  </ul>
  <p v-if="!rows.length" class="cd-hint">No other tokens yet. Add one below.</p>
  <AddPanel label="Add a token">
    <template #default="{ close }">
      <form class="ed-add ed-add-stack" @submit.prevent="add() && close()">
        <div class="ed-grid-2 ed-span-all">
          <label :for="`${uid}-new-name`" class="cd-field"
            ><span>New token name</span
            ><input
              :id="`${uid}-new-name`"
              v-model="newName"
              type="text"
              placeholder="e.g. duration.slow"
          /></label>
          <Choice
            v-model:value="newType"
            label="Type"
            :options="NEW_TOKEN_TYPES"
          />
        </div>
        <label :for="`${uid}-new-value`" class="cd-field"
          ><span>Value</span
          ><input
            :id="`${uid}-new-value`"
            v-model="newValue"
            type="text"
            :placeholder="valueExample(newType)"
            :aria-invalid="error ? 'true' : undefined"
            :aria-describedby="error ? 'cd-add-token-error' : undefined"
        /></label>
        <button type="submit" class="btn">Add token</button>
        <button
          type="button"
          class="btn btn-secondary btn-quiet"
          @click="close"
        >
          Cancel
        </button>
        <p v-if="error" id="cd-add-token-error" class="cd-error" role="alert">
          {{ error }}
        </p>
      </form>
    </template>
  </AddPanel>
</template>
