<script setup lang="ts">
import { computed } from 'vue';
import * as E from '../../lib/edit';
import { cap } from '../guide/parts';
import type { EditorContext } from './context';

const props = defineProps<{ ctx: EditorContext }>();
const themes = computed(() => E.themesOf(props.ctx.doc));
</script>

<template>
  <div
    v-if="themes.length > 1"
    class="ed-theme-bar"
    role="group"
    aria-labelledby="ed-theme-bar-label"
  >
    <span id="ed-theme-bar-label" class="cd-hint">Editing colors for</span>
    <div class="ed-segmented">
      <button
        v-for="theme in themes"
        :key="theme"
        type="button"
        :aria-pressed="theme === ctx.theme"
        @click="ctx.setTheme(theme)"
      >
        {{ cap(theme) }}
      </button>
    </div>
  </div>
</template>
