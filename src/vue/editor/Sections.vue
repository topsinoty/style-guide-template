<script setup lang="ts">
import AddPanel from './AddPanel.vue';
import { computed, ref, useId } from 'vue';
import * as E from '../../lib/edit';
import type { TextSection } from '../../lib/types';
import {
  addSection,
  editSection,
  moveSection,
  removeSection,
  sectionsOf,
  type Section,
} from '../guide/sections';
import type { EditorContext } from './context';
import ItemRow from './ItemRow.vue';
import TextArea from './TextArea.vue';
import TextField from './TextField.vue';
import { elementPreview } from './preview';

const props = defineProps<{ ctx: EditorContext }>();
const sections = computed(() => sectionsOf(props.ctx.meta, props.ctx.tokens));
const h2 = computed(() =>
  elementPreview(props.ctx.tree, props.ctx.vendor, 'h2'),
);
const p = computed(() => elementPreview(props.ctx.tree, props.ctx.vendor, 'p'));
const newTitle = ref('');
const opened = ref<string>();

const edit = (id: string, patch: Partial<TextSection>, typingKey?: string) =>
  props.ctx.setMeta(
    (m) => editSection(m, props.ctx.tokens, id, patch),
    typingKey,
  );

function rename(section: Section, title: string) {
  if (section.group)
    props.ctx.setMeta((m) => E.renameGroup(m, section.group ?? '', title));
  else edit(section.id, { title });
}

const summary = (section: Section) =>
  section.body
    ?.replaceAll(/[#*`[\]()-]/g, '')
    .trim()
    .slice(0, 80);

function add() {
  const title = newTitle.value.trim();
  if (!title) return false;
  const before = new Set(sections.value.map((s) => s.id));
  props.ctx.setMeta((m) => addSection(m, props.ctx.tokens, title));
  opened.value = sections.value.find((s) => !before.has(s.id))?.id;
  newTitle.value = '';
  return true;
}
const uid = useId();
</script>

<template>
  <p class="cd-hint">
    The guide shows these in order. Open one to write its rules: how to use it,
    what to avoid, real examples.
  </p>
  <ul class="ed-list">
    <ItemRow
      v-for="(section, i) in sections"
      :key="section.id"
      :open="opened === section.id"
      :title="section.title"
      :meta="summary(section)"
      :index="i"
      :count="sections.length"
      :remove-label="section.text ? `Remove ${section.title}` : undefined"
      @update:open="(open) => (opened = open ? section.id : undefined)"
      @move="
        (dir) => ctx.setMeta((m) => moveSection(m, ctx.tokens, section.id, dir))
      "
      @remove="ctx.setMeta((m) => removeSection(m, ctx.tokens, section.id))"
    >
      <template #badge>
        <span v-if="section.text" class="ed-badge">Text</span>
      </template>
      <TextField
        label="Title"
        :preview="h2"
        :value="section.title"
        @commit="(value) => value && rename(section, value)"
      />
      <TextArea
        label="Text"
        :preview="p"
        :placeholder="
          section.text
            ? 'What this section says'
            : `How to use ${section.title.toLowerCase()}: rules, do and don't`
        "
        :value="section.body"
        :rows="section.text ? 8 : 5"
        @commit="(body, key) => edit(section.id, { body }, key)"
      />
    </ItemRow>
  </ul>
  <AddPanel label="Add a text section">
    <template #default="{ close }">
      <form class="ed-add" @submit.prevent="add() && close()">
        <label :for="`${uid}-new`" class="cd-field"
          ><span>New text section</span
          ><input
            :id="`${uid}-new`"
            v-model="newTitle"
            type="text"
            placeholder="e.g. Voice and tone"
        /></label>
        <button type="submit" class="btn">Add section</button>
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
