<script setup lang="ts">
import { computed } from 'vue';
import * as E from '../../lib/edit.js';
import { errorMessage } from '../../lib/io.js';
import { fileName } from '../../lib/path.js';
import { urlFor } from '../urls.js';
import Listbox from '../Listbox.vue';
import Choice from './Choice.vue';
import type { EditorContext } from './context.js';
import TextField from './TextField.vue';
import UploadButton from './UploadButton.vue';

const { ctx } = defineProps<{ ctx: EditorContext }>();

const presets = ctx.session.manifest.brands.map((brand) => ({ value: brand.path, label: brand.name }));

const LOGOS = 'logos';
const logos = computed(() => ctx.meta.assetGroups.find((group) => group.id === LOGOS)?.items ?? []);
const mainLogo = computed(() => logos.value[0]);
const mainLogoUrl = computed(() => mainLogo.value && urlFor(mainLogo.value, ctx.session.ctx));

const useAsMainLogo = (src: string) => ctx.setMeta((meta) => E.moveItemToTop(meta, LOGOS, src));

async function uploadLogo(files: File[]) {
  if (!ctx.meta.assetGroups.some((group) => group.id === LOGOS))
    ctx.setMeta((meta) => E.addGroup(meta, 'Logos'));
  const [src] = await ctx.session.addUploads(files, LOGOS);
  if (src) useAsMainLogo(src);
}

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
  <div class="cd-field-row">
    <img v-if="mainLogoUrl" class="cd-thumb" :src="mainLogoUrl" alt="" />
    <div v-if="logos.length" class="cd-field">
      <span>Main logo</span>
      <Listbox
        label="Main logo"
        :options="logos.map((item) => ({ value: item.src, label: item.label ?? fileName(item.src) }))"
        :value="mainLogo?.src ?? ''"
        @update:value="useAsMainLogo"
      />
    </div>
    <UploadButton label="Upload a logo" accept="image/*" @files="uploadLogo" />
  </div>
  <p class="cd-hint">The main logo is shown in the header and first under Branding.</p>
  <Choice label="Start over from" :options="presets" value="" @update:value="startOver" />
  <div class="cd-field-row">
    <button type="button" class="btn btn-secondary btn-small" @click="ctx.session.store.reset()">
      Reset
    </button>
  </div>
  <p class="cd-hint">Reset discards your edits since the last load. Undo (Ctrl+Z) brings them back.</p>
</template>
