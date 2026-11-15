<script setup lang="ts">
import { computed } from 'vue';
import { errorMessage } from '../../lib/io';
import Choice from './Choice.vue';
import type { EditorContext } from './context';

const { ctx } = defineProps<{ ctx: EditorContext }>();
const presets = computed(() =>
  ctx.session.manifest.brands.map((brand) => ({
    value: brand.path,
    label: brand.name,
  })),
);

async function startOver(path: string) {
  try {
    ctx.session.store.load(await ctx.session.loadPreset(path));
  } catch (e) {
    ctx.session.warn(`Could not load the preset: ${errorMessage(e)}`);
  }
}
</script>

<template>
  <p class="cd-hint">
    Both replace the whole brand. Undo (Ctrl+Z) brings your work back.
  </p>
  <div class="cd-field-row">
    <Choice
      label="Replace with a preset"
      placeholder="Pick a preset"
      :options="presets"
      value=""
      @update:value="startOver"
    />
    <button
      type="button"
      class="btn btn-secondary"
      @click="ctx.session.reset()"
    >
      Clear to blank
    </button>
  </div>
  <p class="cd-hint">
    Clear keeps the spacing scale and black and white; it removes everything
    else.
  </p>
</template>
