<script setup lang="ts">
import { errorMessage } from '../../lib/io.js';
import Choice from './Choice.vue';
import type { EditorContext } from './context.js';
import TextField from './TextField.vue';

const { ctx } = defineProps<{ ctx: EditorContext }>();

const presets = ctx.session.manifest.brands.map((brand) => ({ value: brand.path, label: brand.name }));

async function startOver(path: string) {
  try {
    ctx.session.store.load(await ctx.session.loadPreset(path));
  } catch (e) {
    ctx.session.warn(`Could not load the preset: ${errorMessage(e)}`);
  }
}
</script>

<template>
  <TextField
    label="Name"
    input-id="cd-brand-name"
    :value="ctx.doc.name"
    @commit="(value) => value && ctx.edit((doc) => ({ ...doc, name: value }))"
  />
  <Choice label="Start over from" :options="presets" value="" @update:value="startOver" />
  <div class="cd-field-row">
    <button type="button" class="btn btn-secondary btn-small" @click="ctx.session.store.reset()">
      Reset
    </button>
  </div>
  <p class="cd-hint">Reset discards your edits since the last load. Undo (Ctrl+Z) brings them back.</p>
</template>
