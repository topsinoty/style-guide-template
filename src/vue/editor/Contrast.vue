<script setup lang="ts">
import AddPanel from './AddPanel.vue';
import { computed, ref } from 'vue';
import { checkContrast, pairLabel } from '../../lib/contrast.js';
import { cssName } from '../../lib/css.js';
import type { ContrastPair } from '../../lib/types.js';
import Choice from './Choice.vue';
import type { EditorContext } from './context.js';
import IconButton from './IconButton.vue';
import Icon from '../Icon.vue';

const props = defineProps<{ ctx: EditorContext }>();
const colors = computed(() =>
  [...props.ctx.tokens]
    .filter(([, token]) => token.type === 'color')
    .map(([path]) => ({
      value: path,
      label: cssName(path),
      swatch: `var(${cssName(path)})`,
    })),
);
const MINIMUMS = [
  { value: '4.5', label: '4.5:1 body text' },
  { value: '3', label: '3:1 large text, icons, borders' },
  { value: '7', label: '7:1 enhanced' },
];
const pairs = computed(() => props.ctx.meta.contrast ?? []);
const fg = ref('');
const bg = ref('');
const min = ref('4.5');

const results = (pair: ContrastPair) =>
  checkContrast(props.ctx.doc, [pair]).filter(
    (r) => r.fg === pair.fg && r.bg === pair.bg && r.min === pair.min,
  );

const setPairs = (next: ContrastPair[]) =>
  props.ctx.setMeta((m) => ({ ...m, contrast: next }));

function add() {
  const pair = { fg: fg.value, bg: bg.value, min: Number(min.value) };
  if (!pair.fg || !pair.bg || pair.fg === pair.bg) return false;
  setPairs([
    ...pairs.value.filter((p) => p.fg !== pair.fg || p.bg !== pair.bg),
    pair,
  ]);
  fg.value = '';
  bg.value = '';
  return true;
}
</script>

<template>
  <p class="cd-hint">
    Role text on its background, and input and focus borders on the page, are
    always checked in every theme. Add the brand's own pairs, such as ink on
    ground.
  </p>
  <ul v-if="pairs.length" class="ed-list">
    <li
      v-for="pair in pairs"
      :key="`${pair.fg} ${pair.bg}`"
      class="ed-row-head ed-pair"
    >
      <span
        class="ed-role-sample"
        aria-hidden="true"
        :style="{
          color: `var(${cssName(pair.fg)})`,
          background: `var(${cssName(pair.bg)})`,
        }"
        >Aa</span
      >
      <span class="ed-row-text">
        <span class="ed-row-title">{{ pairLabel(pair) }}</span>
        <span
          v-if="!ctx.tokens.has(pair.fg) || !ctx.tokens.has(pair.bg)"
          class="cd-error"
        >
          Not checked: a token in this pair no longer exists.
        </span>
        <span v-else class="ed-row-meta">
          At least {{ pair.min }}:1 ·
          <span
            v-for="r in results(pair)"
            :key="r.context"
            class="cd-status"
            :class="r.pass ? 'is-pass' : 'is-warn'"
            ><Icon :name="r.pass ? 'check' : 'alert'" />{{ r.context }}
            {{ r.ratio }}</span
          >
        </span>
      </span>
      <IconButton
        name="trash"
        :label="`Remove ${pairLabel(pair)}`"
        @click="setPairs(pairs.filter((p) => p !== pair))"
      />
    </li>
  </ul>
  <AddPanel label="Add a pair">
    <template #default="{ close }">
      <form class="ed-add ed-add-stack" @submit.prevent="add() && close()">
        <div class="ed-grid-2 ed-span-all">
          <Choice
            label="Text or mark"
            placeholder="Pick a color"
            :options="colors"
            :value="fg"
            @update:value="fg = $event"
          />
          <Choice
            label="On"
            placeholder="Pick a color"
            :options="colors"
            :value="bg"
            @update:value="bg = $event"
          />
        </div>
        <Choice v-model:value="min" label="Minimum ratio" :options="MINIMUMS" />
        <button type="submit" class="btn" :disabled="!fg || !bg || fg === bg">
          Add pair
        </button>
        <button
          type="button"
          class="btn btn-secondary btn-quiet"
          @click="close"
        >
          Cancel
        </button>
      </form>
    </template>
  </AddPanel>
</template>
