<script setup lang="ts">
import { onClickOutside, onKeyStroke, useScrollLock } from '@vueuse/core';
import { FocusScope } from 'reka-ui';
import { computed, nextTick, ref, useTemplateRef, watch } from 'vue';
import Icon from '../Icon.vue';

const props = withDefaults(defineProps<{ as?: string; label?: string }>(), { as: 'div', label: 'this card' });
const open = ref(false);
const title = computed(() => props.label.charAt(0).toUpperCase() + props.label.slice(1));
const card = useTemplateRef<HTMLElement>('card');
const opener = useTemplateRef<HTMLButtonElement>('opener');
const closer = useTemplateRef<HTMLButtonElement>('closer');
const locked = useScrollLock(document.body);

watch(open, async (isOpen) => {
  locked.value = isOpen;
  await nextTick();
  (isOpen ? closer : opener).value?.focus();
});
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
    >
      <Teleport to="body">
        <div v-if="open" class="cd-card-backdrop" aria-hidden="true"></div>
      </Teleport>
      <div v-if="open" class="cd-card-head">
        <b>{{ title }}</b>
        <button ref="closer" type="button" class="btn btn-secondary" @click="open = false">
          <Icon name="minimize" /> Close
        </button>
      </div>
      <button
        v-else
        ref="opener"
        type="button"
        class="cd-fullscreen"
        :aria-label="`Show ${label} full screen`"
        @click="open = true"
      >
        <Icon name="maximize" />
      </button>
      <slot />
    </component>
  </FocusScope>
</template>
