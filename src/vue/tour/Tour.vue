<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import { useElementSize, useEventListener, useMediaQuery, useStorage, useWindowSize } from '@vueuse/core';
import { FocusScope } from 'reka-ui';
import { areaId, scrollToArea } from '../editor/areas.js';
import type { TourStep } from './steps.js';

const props = defineProps<{ steps: TourStep[] }>();
const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ drawer: [open: boolean] }>();

const GAP = 12;
const MARGIN = 16;
const PAD = 6;

const tab = useStorage('styleguide:editor-tab', 'Brand');
const index = ref(0);
const box = ref<{ top: number; left: number; width: number; height: number } | null>(null);
const card = useTemplateRef<HTMLElement>('card');
const primary = useTemplateRef<HTMLButtonElement>('primary');
const { width: cardWidth, height: cardHeight } = useElementSize(card, undefined, { box: 'border-box' });
const { width: vw, height: vh } = useWindowSize();
const narrow = useMediaQuery('(max-width: 47.99rem)');
const step = computed(() => props.steps[index.value]);
let target: Element | null = null;
const inDrawer = ref(false);
let frame = 0;
let returnTo: HTMLElement | null = null;

const find = (s: TourStep) => {
  if (s.area) return document.querySelector(`section[aria-labelledby="${areaId(s.area)}"]`);
  return s.target ? document.querySelector(s.target) : null;
};

async function waitFor(s: TourStep, tries = 30): Promise<Element | undefined> {
  await new Promise(requestAnimationFrame);
  const el = find(s);
  if (el?.getClientRects().length) return el;
  return tries > 0 ? waitFor(s, tries - 1) : undefined;
}

function settle(s: TourStep): Promise<Element | null | undefined> {
  if (s.drawer !== undefined) emit('drawer', s.drawer);
  if (s.tab) tab.value = s.tab;
  return s.target || s.area ? waitFor(s) : Promise.resolve(null);
}

let moving = false;

async function go(to: number, dir: 1 | -1) {
  if (moving) return;
  moving = true;
  try {
    await move(to, dir);
  } finally {
    moving = false;
  }
}

async function move(to: number, dir: 1 | -1): Promise<void> {
  if (to < 0) return;
  if (to >= props.steps.length) return finish();
  const s = props.steps[to];
  const el = await settle(s);
  if (el === undefined) return move(to + dir, dir);
  index.value = to;
  target = el;
  inDrawer.value = !!el?.closest('.cd-drawer');
  if (s.area) scrollToArea(s.area);
  else el?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  await nextTick();
  primary.value?.focus();
}

function visible(el: Element) {
  let { top, left, bottom, right } = el.getBoundingClientRect();
  const scroller = el.closest('.cd-drawer-body');
  if (scroller) {
    const frameRect = scroller.getBoundingClientRect();
    const bar = scroller.querySelector('.ed-sticky');
    const sticky = bar && !bar.contains(el) ? bar.getBoundingClientRect().bottom : frameRect.top;
    top = Math.max(top, sticky);
    bottom = Math.min(bottom, frameRect.bottom);
  }
  top = Math.max(top, 0);
  left = Math.max(left, 0);
  bottom = Math.min(bottom, window.innerHeight);
  right = Math.min(right, window.innerWidth);
  return { top: top - PAD, left: left - PAD, width: right - left + 2 * PAD, height: bottom - top + 2 * PAD };
}

function track() {
  const next = target ? visible(target) : null;
  const last = box.value;
  const same =
    next?.top === last?.top &&
    next?.left === last?.left &&
    next?.width === last?.width &&
    next?.height === last?.height;
  if (!same) box.value = next;
  frame = requestAnimationFrame(track);
}

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), Math.max(min, max));

const placement = computed(() => {
  const w = cardWidth.value;
  const h = cardHeight.value;
  if (narrow.value) return { left: `${MARGIN}px`, right: `${MARGIN}px`, bottom: `${MARGIN}px` };
  const r = box.value;
  if (!r) return { left: `${(vw.value - w) / 2}px`, top: `${(vh.value - h) / 2}px` };
  const x = clamp(r.left, MARGIN, vw.value - w - MARGIN);
  const y = clamp(r.top, MARGIN, vh.value - h - MARGIN);
  const below = {
    left: x,
    top: r.top + r.height + GAP,
    fits: r.top + r.height + GAP + h <= vh.value - MARGIN,
  };
  const above = { left: x, top: r.top - GAP - h, fits: r.top - GAP - h >= MARGIN };
  const before = { left: r.left - GAP - w, top: y, fits: r.left - GAP - w >= MARGIN };
  const after = {
    left: r.left + r.width + GAP,
    top: y,
    fits: r.left + r.width + GAP + w <= vw.value - MARGIN,
  };
  const options = inDrawer.value ? [before, below, above, after] : [below, above, before, after];
  const best = options.find((o) => o.fits) ?? { left: MARGIN, top: vh.value - h - MARGIN };
  return { left: `${best.left}px`, top: `${best.top}px` };
});

function finish() {
  open.value = false;
}

watch(
  open,
  (isOpen) => {
    if (isOpen) {
      if (document.activeElement instanceof HTMLElement) returnTo = document.activeElement;
      box.value = null;
      target = null;
      frame = requestAnimationFrame(track);
      void go(0, 1);
    } else {
      cancelAnimationFrame(frame);
      target = null;
      returnTo?.focus();
      returnTo = null;
    }
  },
  { immediate: true },
);

useEventListener(document, 'keydown', (e: KeyboardEvent) => {
  if (!open.value) return;
  if (e.key === 'Escape') finish();
  else if (e.key === 'ArrowRight') void go(index.value + 1, 1);
  else if (e.key === 'ArrowLeft' && index.value > 0) void go(index.value - 1, -1);
  else return;
  e.preventDefault();
});
</script>

<template>
  <div v-if="open" class="cd-tour">
    <div class="cd-tour-shield" aria-hidden="true"></div>
    <div
      class="cd-tour-spot"
      :class="{ 'is-empty': !box }"
      aria-hidden="true"
      :style="
        box
          ? { top: `${box.top}px`, left: `${box.left}px`, width: `${box.width}px`, height: `${box.height}px` }
          : undefined
      "
    ></div>
    <FocusScope trapped loop as-child>
      <section
        ref="card"
        class="cd-tour-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cd-tour-title"
        aria-describedby="cd-tour-body"
        :style="placement"
      >
        <p class="cd-tour-count">{{ index + 1 }} of {{ steps.length }}</p>
        <div aria-live="polite" class="cd-tour-text">
          <h2 id="cd-tour-title">{{ step.title }}</h2>
          <p id="cd-tour-body">{{ step.body }}</p>
        </div>
        <div class="cd-tour-actions">
          <button type="button" class="btn btn-secondary btn-quiet" @click="finish">Skip tour</button>
          <span class="cd-tour-nav">
            <button v-if="index > 0" type="button" class="btn btn-secondary" @click="go(index - 1, -1)">
              Back
            </button>
            <button ref="primary" type="button" class="btn" @click="go(index + 1, 1)">
              {{ index === steps.length - 1 ? 'Finish' : index === 0 ? 'Start' : 'Next' }}
            </button>
          </span>
        </div>
      </section>
    </FocusScope>
  </div>
</template>
