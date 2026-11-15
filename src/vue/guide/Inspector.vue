<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import { elementStyles, ELEMENTS } from '../../lib/elements.js';
import type { ResolverDoc } from '../../lib/types.js';

const props = defineProps<{ doc: ResolverDoc; vendor: string; root?: HTMLElement | null }>();
const TEXT = 'h1, h2, h3, h4, h5, h6, p, small, code, li, a, th, td';
const target = ref<HTMLElement>();
const box = ref({ top: 0, left: 0, width: 0, height: 0 });
const styles = computed(() => elementStyles(props.doc.sets.foundation.sources[0], props.vendor));

const info = computed(() => {
  const el = target.value;
  if (!el) return null;
  const tag = el.tagName.toLowerCase();
  const style = styles.value.get(tag);
  const css = getComputedStyle(el);
  const family = css.fontFamily.split(',')[0].replaceAll('"', '');
  return {
    tag,
    style: style ? (ELEMENTS.find((e) => e.value === tag)?.label ?? tag) + ` · ${style}` : null,
    font: `${family} ${css.fontWeight} · ${Math.round(Number.parseFloat(css.fontSize))}px / ${css.lineHeight === 'normal' ? 'normal' : Math.round(Number.parseFloat(css.lineHeight)) + 'px'}`,
  };
});

function show(el: Element | null | undefined) {
  const found = el?.closest(TEXT);
  if (!(found instanceof HTMLElement) || !props.root?.contains(found)) {
    target.value = undefined;
    return;
  }
  const r = found.getBoundingClientRect();
  target.value = found;
  box.value = { top: r.top, left: r.left, width: r.width, height: r.height };
}

useEventListener(
  () => props.root,
  'pointerover',
  (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.target instanceof Element) show(e.target);
  },
);
useEventListener(
  () => props.root,
  'pointerleave',
  () => (target.value = undefined),
);
useEventListener(document, 'selectionchange', () => {
  const selection = document.getSelection();
  const node = selection?.anchorNode;
  if (!node || selection.isCollapsed) target.value = undefined;
  else show(node instanceof Element ? node : node.parentElement);
});
useEventListener(window, 'scroll', () => (target.value = undefined), { passive: true });

const tipTop = computed(() =>
  box.value.top > 64 ? box.value.top - 8 : box.value.top + box.value.height + 8,
);
const above = computed(() => box.value.top > 64);
</script>

<template>
  <template v-if="info">
    <div
      class="cd-inspect-box"
      aria-hidden="true"
      :style="{
        top: `${box.top}px`,
        left: `${box.left}px`,
        width: `${box.width}px`,
        height: `${box.height}px`,
      }"
    ></div>
    <div
      class="cd-inspect-tip"
      :class="{ above }"
      aria-hidden="true"
      :style="{ top: `${tipTop}px`, left: `${Math.max(8, box.left)}px` }"
    >
      <code>&lt;{{ info.tag }}&gt;</code>
      <span v-if="info.style">{{ info.style }}</span>
      <span class="cd-inspect-font">{{ info.font }}</span>
    </div>
  </template>
</template>
