<script setup lang="ts">
import { computed } from 'vue';
import type { EditorContext } from './context.js';
import { elementPreview } from './preview.js';
import TextArea from './TextArea.vue';
import TextField from './TextField.vue';

const { ctx } = defineProps<{ ctx: EditorContext }>();

const preview = (element: string) => computed(() => elementPreview(ctx.tree, ctx.vendor, element));
const h1 = preview('h1');
const p = preview('p');

const FORMAT_HINT =
  'Shown under the name. Markdown works here and in section text: **bold**, *italic*, `code`, [link](https://…), - lists, ## headings.';
</script>

<template>
  <TextField
    label="Name"
    input-id="cd-brand-name"
    :preview="h1"
    :value="ctx.doc.name"
    @commit="(value) => value && ctx.edit((doc) => ({ ...doc, name: value }))"
  />
  <TextArea
    label="Introduction"
    :preview="p"
    :value="ctx.doc.description"
    :hint="FORMAT_HINT"
    placeholder="Who the brand is for and what it should feel like."
    @commit="(value, key) => ctx.edit((doc) => ({ ...doc, description: value || undefined }), key)"
  />
</template>
