<script setup lang="ts">
import { computed, ref } from 'vue';
import { useEventListener } from '@vueuse/core';
import { elementStyles, ELEMENTS } from '~/lib';
import type { ResolverDoc } from '~/lib';

const props = defineProps<{
  doc: ResolverDoc;
  vendor: string;
  root?: HTMLElement | null;
}>();
const TEXT = 'h1, h2, h3, h4, h5, h6, p, small, code, li, a, th, td';
const target = ref<HTMLElement>();
const box = ref({ top: 0, left: 0, width: 0, height: 0 });
const styles = computed(() =>
  elementStyles(props.doc.sets.foundation.sources[0], props.vendor),
);

const px = (value: string) => `${Math.round(Number.parseFloat(value))}px`;

const info = computed(() => {
  const el = target.value;

  if (!el) {
    return null;
  }

  const tag = el.tagName.toLowerCase();
  const style = styles.value.get(tag);
  const css = getComputedStyle(el);
  const family = css.fontFamily.split(',')[0].replaceAll('"', '');

  const element = ELEMENTS.find((e) => e.value === tag)?.label ?? tag;
  const lineHeight =
    css.lineHeight === 'normal' ? 'normal' : px(css.lineHeight);
  const font = `${family} ${css.fontWeight} · ${px(css.fontSize)} / ${lineHeight}`;

  return { tag, style: style ? `${element} · ${style}` : null, font };
});

function visibleRect(el: HTMLElement) {
  let { top, left, right, bottom } = el.getBoundingClientRect();

  top = Math.max(
    top,
    document.querySelector('header')?.getBoundingClientRect().bottom ?? 0,
  );
  for (let parent = el.parentElement; parent; parent = parent.parentElement) {
    const { overflowX, overflowY } = getComputedStyle(parent);

    if (overflowX === 'visible' && overflowY === 'visible') {
      continue;
    }

    const r = parent.getBoundingClientRect();

    top = Math.max(top, r.top);
    left = Math.max(left, r.left);
    right = Math.min(right, r.right);
    bottom = Math.min(bottom, r.bottom);
  }

  return { top, left, width: right - left, height: bottom - top };
}

const hasText = (el: HTMLElement) =>
  [...el.childNodes].some(
    (node) => node.nodeType === Node.TEXT_NODE && node.textContent?.trim(),
  );

function show(el: Element | null | undefined) {
  const found = el?.closest('.cd-code') ? null : el?.closest(TEXT);

  if (
    !(found instanceof HTMLElement) ||
    !props.root?.contains(found) ||
    !hasText(found)
  ) {
    target.value = undefined;

    return;
  }

  const rect = visibleRect(found);

  target.value = rect.width > 0 && rect.height > 0 ? found : undefined;
  box.value = rect;
}

useEventListener(
  () => props.root,
  'pointerover',
  (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && e.target instanceof Element) {
      show(e.target);
    }
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

  if (!node || selection.isCollapsed) {
    target.value = undefined;
  } else {
    show(node instanceof Element ? node : node.parentElement);
  }
});
useEventListener(window, 'scroll', () => target.value && show(target.value), {
  passive: true,
  capture: true,
});

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
