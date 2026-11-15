<script setup lang="ts">
import { computed, ref, useId } from 'vue';
import { cssName } from '../../lib/css';
import * as E from '../../lib/edit';
import { nodeAt } from '../../lib/tree';
import type { EditorContext } from './context';
import ItemRow from './ItemRow.vue';
import TextAreaField from './TextAreaField.vue';

const props = defineProps<{ ctx: EditorContext }>();
const LIMIT = 12;
const query = ref('');
const opened = ref<string>();

const notable = computed(() =>
  [...props.ctx.tokens.keys()].filter(
    (path) => nodeAt(props.ctx.tree, path)?.$value !== undefined,
  ),
);
const noteOf = (path: string) => props.ctx.tokens.get(path)?.description;
const written = computed(() => notable.value.filter((path) => noteOf(path)));
const matches = computed(() => {
  const q = query.value
    .trim()
    .toLowerCase()
    .replace(/^--/, '')
    .replaceAll('-', '.');
  if (!q) return written.value;
  return notable.value.filter(
    (path) => path.includes(q) || cssName(path).includes(query.value.trim()),
  );
});
const uid = useId();
</script>

<template>
  <p class="cd-hint">
    Say what a token is for: "Page background. Text on it uses ink." The guide
    shows the note next to the token.
    {{ written.length }} of {{ notable.length }} tokens have one.
  </p>
  <label :for="`${uid}-find`" class="cd-field"
    ><span>Find a token</span>
    <input
      :id="`${uid}-find`"
      v-model="query"
      type="search"
      placeholder="primary, spacing, ground…"
    />
  </label>
  <ul v-if="matches.length" class="ed-list">
    <ItemRow
      v-for="path in matches.slice(0, LIMIT)"
      :key="path"
      :open="opened === path"
      :title="cssName(path)"
      :meta="noteOf(path) ?? 'No note yet'"
      @update:open="(open) => (opened = open ? path : undefined)"
    >
      <TextAreaField
        label="Usage note"
        :value="noteOf(path)"
        :rows="2"
        placeholder="What it is for, and what to pair it with."
        @commit="
          (value, key) =>
            ctx.edit((doc) => E.setDescription(doc, path, value), key)
        "
      />
    </ItemRow>
  </ul>
  <p v-if="matches.length > LIMIT" class="cd-hint">
    {{ matches.length - LIMIT }} more match. Type more of the name to narrow it.
  </p>
  <p v-else-if="!matches.length" class="cd-hint">
    {{
      query.trim()
        ? `No token matches "${query.trim()}".`
        : 'No notes yet. Find a token above to add one.'
    }}
  </p>
</template>
