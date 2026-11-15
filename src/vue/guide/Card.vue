<script setup lang="ts">
import { onClickOutside, onKeyStroke, useResizeObserver, useScrollLock } from '@vueuse/core';
import { FocusScope } from 'reka-ui';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import Icon from '../Icon.vue';

const props = withDefaults(defineProps<{ as?: string; label?: string }>(), { as: 'div', label: 'this card' });
const open = ref(false);
const clipped = ref(false);
const title = computed(() => props.label.charAt(0).toUpperCase() + props.label.slice(1));
const card = useTemplateRef<HTMLElement>('card');
const opener = useTemplateRef<HTMLButtonElement>('opener');
const closer = useTemplateRef<HTMLButtonElement>('closer');
const locked = useScrollLock(document.body);

const scrolls = (overflow: string) => overflow === 'auto' || overflow === 'scroll';
function isClipped(el: Element) {
  const { overflowX, overflowY } = getComputedStyle(el);
  return (
    (scrolls(overflowX) && el.scrollWidth > el.clientWidth + 1) ||
    (scrolls(overflowY) && el.scrollHeight > el.clientHeight + 1)
  );
}
function measure() {
  clipped.value = [...(card.value?.querySelectorAll('*') ?? [])].some(isClipped);
}

watch(open, async (isOpen) => {
  locked.value = isOpen;
  await nextTick();
  if (!isOpen) {
    measure();
    await nextTick();
  }
  (isOpen ? closer : opener).value?.focus();
});
useResizeObserver(card, measure);
onKeyStroke('Escape', () => (open.value = false));
onClickOutside(card, () => (open.value = false));
</script>

<template>
  <FocusScope :trapped="open" :loop="open" as-child>
    <component
      :is="as"
      ref="card"
      class="cd-box cd-card"
      :class="{ 'is-open': open }"
      :role="open ? 'dialog' : undefined"
      :aria-modal="open || undefined"
      :aria-label="open ? title : undefined"
      @pointerenter="measure"
      @focusin="measure"
    >
      <Teleport to="body">
        <div v-if="open" class="cd-card-backdrop" aria-hidden="true"></div>
      </Teleport>
      <div v-if="open" class="cd-card-head">
        <b>{{ title }}</b>
        <button
          ref="closer"
          type="button"
          class="cd-card-button"
          :aria-label="`Close ${label}`"
          @click="open = false"
        >
          <Icon name="close" />
        </button>
      </div>
      <button
        v-else-if="clipped"
        ref="opener"
        type="button"
        class="cd-card-button cd-fullscreen"
        :aria-label="`Show ${label} full screen`"
        @click="open = true"
      >
        <Icon name="maximize" />
      </button>
      <div class="cd-card-body"><slot /></div>
    </component>
  </FocusScope>
</template>
