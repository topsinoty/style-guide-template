<script setup lang="ts">
import { onKeyStroke, useScrollLock } from '@vueuse/core';
import { FocusScope } from 'reka-ui';
import { nextTick, ref, useTemplateRef, watch } from 'vue';
import Icon from '../Icon.vue';

withDefaults(defineProps<{ as?: string; label?: string }>(), { as: 'div', label: 'this card' });
const open = ref(false);
const button = useTemplateRef<HTMLButtonElement>('button');
const locked = useScrollLock(document.body);

watch(open, async (isOpen) => {
  locked.value = isOpen;
  await nextTick();
  button.value?.focus();
});
onKeyStroke('Escape', () => (open.value = false));
</script>

<template>
  <FocusScope :trapped="open" :loop="open" as-child>
    <component
      :is="as"
      class="cd-box cd-card"
      :class="{ 'is-open': open }"
      :role="open ? 'dialog' : undefined"
      :aria-modal="open || undefined"
      :aria-label="open ? label : undefined"
    >
      <button
        ref="button"
        type="button"
        class="cd-fullscreen"
        :aria-label="open ? `Close ${label}` : `Show ${label} full screen`"
        @click="open = !open"
      >
        <Icon :name="open ? 'minimize' : 'maximize'" />
      </button>
      <slot />
    </component>
  </FocusScope>
</template>
