<script setup lang="ts">
import { computed } from 'vue';
import { useStorage } from '@vueuse/core';
import { TabsContent, TabsIndicator, TabsList, TabsRoot, TabsTrigger } from 'reka-ui';
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
import OtherTokens from './OtherTokens.vue';
import Sections from './Sections.vue';
import StartAgain from './StartAgain.vue';
import Themes from './Themes.vue';
import ThemeBar from './ThemeBar.vue';
import UsageNotes from './UsageNotes.vue';
import Contrast from './Contrast.vue';

const props = defineProps<{ session: Session; tokens: Tokens; theme: string }>();
const emit = defineEmits<{ theme: [theme: string] }>();
const ctx = computed(() =>
  editorContext(props.session, props.theme, props.tokens, (theme) => emit('theme', theme)),
);

const groups = [
  {
    name: 'Brand',
    areas: [
      { name: 'Name and introduction', component: Brand },
      { name: 'Guide sections', component: Sections },
      { name: 'Usage notes', component: UsageNotes },
      { name: 'Start again', component: StartAgain },
    ],
  },
  {
    name: 'Color',
    themed: true,
    areas: [
      { name: 'Palette', component: Palette },
      { name: 'Roles', component: Roles },
      { name: 'Contrast', component: Contrast },
      { name: 'Themes', component: Themes },
    ],
  },
  { name: 'Type', areas: [{ name: 'Fonts and type styles', component: Type }] },
  {
    name: 'Tokens',
    areas: [
      { name: 'Scales', component: Scales },
      { name: 'Shadows', component: Shadow },
      { name: 'Other tokens', component: OtherTokens },
    ],
  },
  { name: 'Assets', areas: [{ name: 'Asset groups', component: Assets }] },
];
const tab = useStorage('styleguide:editor-tab', 'Brand');
const active = computed({
  get: () => (groups.some((g) => g.name === tab.value) ? tab.value : 'Brand'),
  set: (value) => (tab.value = value),
});
const current = computed(() => groups.find((g) => g.name === active.value) ?? groups[0]);
const slug = (name: string) => `ed-${name.toLowerCase().replaceAll(' ', '-')}`;

function jump(name: string) {
  const heading = document.getElementById(slug(name));
  const body = heading?.closest('.cd-drawer-body');
  const sticky = body?.querySelector('.ed-sticky');
  if (!heading || !body || !sticky) return;
  // Land just under the sticky bar, whose height changes with the theme switch.
  const gap = 12;
  body.scrollBy({
    top: heading.getBoundingClientRect().top - sticky.getBoundingClientRect().bottom - gap,
  });
  heading
    .closest('section')
    ?.querySelector<HTMLElement>('input, textarea, button')
    ?.focus({ preventScroll: true });
}
</script>

<template>
  <TabsRoot v-model="active">
    <div class="ed-sticky">
      <TabsList class="ed-tabs" aria-label="What to edit">
        <TabsTrigger v-for="group in groups" :key="group.name" :value="group.name">{{
          group.name
        }}</TabsTrigger>
        <TabsIndicator class="ed-tab-indicator" />
      </TabsList>
      <ThemeBar v-if="current.themed" :ctx="ctx" />
    </div>
    <TabsContent v-for="group in groups" :key="group.name" :value="group.name" class="ed-panel">
      <nav v-if="group.areas.length > 1" class="ed-jump" :aria-label="`${group.name} areas`">
        <button v-for="area in group.areas" :key="area.name" type="button" @click="jump(area.name)">
          {{ area.name }}
        </button>
      </nav>
      <section
        v-for="area in group.areas"
        :key="area.name"
        class="ed-area"
        :aria-labelledby="slug(area.name)"
      >
        <h3 :id="slug(area.name)">{{ area.name }}</h3>
        <component :is="area.component" :ctx="ctx" />
      </section>
    </TabsContent>
  </TabsRoot>
</template>
