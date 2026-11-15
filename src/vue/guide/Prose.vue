<script setup lang="ts">
import { createTextVNode, h, type FunctionalComponent } from 'vue';
import { parseBlocks, type Block, type Inline } from '~/lib';

defineProps<{ text: string }>();

const TAGS = { strong: 'strong', em: 'em', code: 'code' } as const;
const inline = (parts: Inline[]) =>
  parts.map((part) => {
    if (part.kind === 'text') {
      return createTextVNode(part.text);
    }

    if (part.kind === 'link') {
      return h('a', { href: part.href, rel: 'noopener noreferrer' }, part.text);
    }

    return h(TAGS[part.kind], part.text);
  });
const block = (b: Block) => {
  if (b.kind === 'list') {
    return h(
      'ul',
      b.items.map((item) => h('li', inline(item))),
    );
  }

  return h(b.kind === 'heading' ? 'h3' : 'p', inline(b.inline));
};

const Blocks: FunctionalComponent<{ text: string }> = ({ text }) =>
  parseBlocks(text).map(block);
</script>

<template>
  <div class="cd-prose"><Blocks :text="text" /></div>
</template>
