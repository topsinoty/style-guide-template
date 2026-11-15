<script setup lang="ts">
import { computed } from 'vue';
import * as E from '../../lib/edit.js';
import { paletteId } from '../../lib/palette.js';
import type { EditorContext } from './context.js';
import IconButton from './IconButton.vue';
import NameForm from './NameForm.vue';

const props = defineProps<{ ctx: EditorContext }>();
const themes = computed(() => E.themesOf(props.ctx.doc));
const fallback = computed(() => E.defaultTheme(props.ctx.doc));

function rename(from: string, event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return;
  const to = paletteId(event.target.value);
  if (!to || to === from) {
    event.target.value = from;
    return;
  }
  if (themes.value.includes(to)) {
    event.target.value = from;
    return props.ctx.session.warn(`There is already a theme named ${to}.`);
  }
  props.ctx.edit((doc) => E.renameTheme(doc, from, to));
  if (props.ctx.theme === from) props.ctx.setTheme(to);
}

function add(name: string) {
  props.ctx.edit((doc) => E.addTheme(doc, name));
  props.ctx.setTheme(name);
}
</script>

<template>
  <p class="cd-hint">
    Light and dark, or print and web. The default holds every color; another theme starts as a copy of
    {{ fallback ?? 'it' }} and keeps only what you change.
  </p>
  <ul v-if="themes.length" class="ed-list">
    <li v-for="theme in themes" :key="theme" class="ed-row-head">
      <input
        class="ed-inline-input"
        type="text"
        :value="theme"
        :aria-label="`Name of the ${theme} theme`"
        @change="rename(theme, $event)"
      />
      <span v-if="theme === fallback" class="ed-badge">Default</span>
      <IconButton
        v-else
        name="trash"
        :label="`Remove the ${theme} theme`"
        @click="ctx.edit((doc) => E.removeTheme(doc, theme))"
      />
    </li>
  </ul>
  <NameForm label="New theme" action="Add theme" placeholder="print" :taken="themes" @add="add" />
</template>
