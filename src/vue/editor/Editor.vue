<script setup lang="ts">
import { computed } from 'vue';
import { AccordionContent, AccordionHeader, AccordionItem, AccordionRoot, AccordionTrigger } from 'reka-ui';
import type { Session } from '../../app/session.js';
import type { Tokens } from '../../lib/types.js';
import { editorContext } from './context.js';
import Brand from './Brand.vue';
import Palette from './Palette.vue';
import Roles from './Roles.vue';
import Type from './Type.vue';
import Scales from './Scales.vue';
import Shadow from './Shadow.vue';
import Assets from './Assets.vue';

const props = defineProps<{ session: Session; tokens: Tokens; theme: string }>();
const emit = defineEmits<{ theme: [theme: string] }>();
const ctx = computed(() =>
  editorContext(props.session, props.theme, props.tokens, (theme) => emit('theme', theme)),
);
const areas = [
  { name: 'Brand', component: Brand },
  { name: 'Palette', component: Palette },
  { name: 'Roles', component: Roles },
  { name: 'Fonts and type', component: Type },
  { name: 'Scales', component: Scales },
  { name: 'Shadow', component: Shadow },
  { name: 'Assets', component: Assets },
];
</script>

<template>
  <AccordionRoot type="multiple" :default-value="['Brand', 'Palette']">
    <AccordionItem v-for="area in areas" :key="area.name" :value="area.name" class="cd-drawer-area">
      <AccordionHeader as="h3">
        <AccordionTrigger class="cd-drawer-trigger">{{ area.name }}</AccordionTrigger>
      </AccordionHeader>
      <AccordionContent>
        <component :is="area.component" :ctx="ctx" />
      </AccordionContent>
    </AccordionItem>
  </AccordionRoot>
</template>
