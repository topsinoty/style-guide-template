<script setup lang="ts">
import { computed, nextTick, ref, useTemplateRef, watch, watchEffect } from 'vue';
import {
  onKeyStroke,
  useDropZone,
  useElementBounding,
  useEventListener,
  useFileDialog,
  useMediaQuery,
  usePreferredDark,
  usePreferredReducedMotion,
  useStorage,
  useStyleTag,
  useTitle,
  watchDebounced,
  whenever,
} from '@vueuse/core';
import {
  DialogClose,
  DialogContent,
  DialogRoot,
  DialogTitle,
  DialogTrigger,
  SwitchRoot,
  SwitchThumb,
} from 'reka-ui';
import type { Session } from '../app/session.js';
import { download } from './download.js';
import { DEFAULT_ROOT_SIZE, mainLogo } from '../lib/assets.js';
import { isDark } from '../lib/color.js';
import { defaultTheme, themesOf } from '../lib/edit.js';
import { narrow, isColor } from '../lib/values.js';
import Listbox from './Listbox.vue';
import { cap } from './guide/parts.js';
import { errorMessage } from '../lib/io.js';
import { urlFor } from './urls.js';
import Action from './Action.vue';
import Icon from './Icon.vue';
import Guide from './guide/Guide.vue';
import Editor from './editor/Editor.vue';
import { sectionsOf } from './guide/sections.js';
import { provideSession } from './useSession.js';
import { deriveView } from './view.js';

const props = defineProps<{ session: Session }>();
const session = provideSession(props.session);

const themeChoice = useStorage('styleguide:theme', 'auto');
const prefersDark = usePreferredDark();
const themes = computed(() => themesOf(session.value.doc));
// The stored choice may name a theme this brand does not have; fall back to the system's, then the default.
const theme = computed(() => {
  const system = prefersDark.value ? 'dark' : 'light';
  return (
    [themeChoice.value, system].find((t) => themes.value.includes(t)) ??
    defaultTheme(session.value.doc) ??
    system
  );
});
const lightDark = computed(
  () => themes.value.length === 2 && themes.value.every((t) => t === 'light' || t === 'dark'),
);
const themeOptions = computed(() => themes.value.map((t) => ({ value: t, label: cap(t) })));
const wide = useMediaQuery('(min-width: 48rem)');
const reduceMotion = usePreferredReducedMotion();
const { height: headerHeight } = useElementBounding(useTemplateRef('header'));

const editing = ref(false);
const editorMounted = ref(false);
const exporting = ref(false);

const view = computed(() => deriveView(session.value, theme.value));
const sections = computed(() => sectionsOf(view.value.meta, view.value.tokens));
const logo = computed(() => mainLogo(view.value.meta));
const logoUrl = computed(() => logo.value && urlFor(logo.value, session.value.ctx));

watchEffect(() => {
  const root = document.documentElement;
  root.dataset.theme = theme.value;
  root.style.setProperty(
    '--ed-rem',
    `${DEFAULT_ROOT_SIZE / (view.value.meta.rootSize ?? DEFAULT_ROOT_SIZE)}rem`,
  );
  const page = narrow(view.value.tokens.get('color.page.background')?.resolved, isColor);
  root.style.colorScheme = isDark(page) ? 'dark' : 'light';
});

useTitle(() => `${session.value.doc.name ?? 'Brand'} | Style Guide`);
useStyleTag(
  computed(() => view.value.css),
  { id: 'brand-css' },
);
watchDebounced(view, () => session.value.prune(), { debounce: 2000, immediate: true });
whenever(editing, () => (editorMounted.value = true), { once: true });

useEventListener(document.fonts, 'loadingerror', (e: FontFaceSetLoadEvent) => {
  const failed = e.fontfaces.map((f) => `${f.family.replace(/"/g, '')} ${f.weight} ${f.style}`);
  session.value.warn(...failed.map((font) => `Font could not be loaded: ${font}`));
});

// Cross-fade the whole page between themes instead of snapping.
function previewTheme(next: string) {
  const apply = async () => {
    themeChoice.value = next;
    await nextTick();
  };
  if (next === theme.value || !document.startViewTransition || reduceMotion.value === 'reduce') void apply();
  else document.startViewTransition(apply);
}

async function focusBrandName(event: Event) {
  event.preventDefault();
  await nextTick();
  const target =
    document.getElementById('cd-brand-name') ??
    document.querySelector<HTMLElement>('#cd-drawer [role="tab"][aria-selected="true"]');
  target?.focus();
}

const dark = computed({
  get: () => theme.value === 'dark',
  set: (on) => {
    previewTheme(on ? 'dark' : 'light');
  },
});

const TEXT_ENTRY = 'input, textarea, [contenteditable], [role=listbox]';

function historyShortcut(e: KeyboardEvent): 'undo' | 'redo' | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null;
  const key = e.key.toLowerCase();
  if (key === 'z') return e.shiftKey ? 'redo' : 'undo';
  if (key === 'y' && !e.shiftKey) return 'redo';
  return null;
}

onKeyStroke(['z', 'Z', 'y', 'Y'], (e) => {
  const action = historyShortcut(e);
  const typing = e.target instanceof Element && e.target.closest(TEXT_ENTRY);
  if (!action || typing) return;
  e.preventDefault();
  session.value.store[action]();
});

function save() {
  const file = session.value.brandJson();
  download(file.name, file.data, 'application/json');
}

async function exportKit() {
  if (exporting.value) return;
  exporting.value = true;
  try {
    const { name, data } = await session.value.brandKit();
    download(name, data, 'application/zip');
  } catch (e) {
    session.value.warn(`Export failed: ${errorMessage(e)}`);
  } finally {
    exporting.value = false;
  }
}

const loadDialog = useFileDialog({ reset: true });
loadDialog.onChange(async (files) => {
  if (files) await session.value.receive([...files]);
});

const { isOverDropZone: dragging } = useDropZone(document, {
  checkValidity: (items) => [...items].some((item) => item.kind === 'file'),
  async onDrop(files) {
    if (files) await session.value.receive(files);
  },
});

const current = ref<string[]>([]);
const links = useTemplateRef<HTMLAnchorElement[]>('links');

watch(current, (ids, before) => {
  const entered = ids.find((id) => !before.includes(id));
  const link = links.value?.find((a) => a.hash === `#${entered}`);
  link?.scrollIntoView({
    block: 'nearest',
    inline: 'center',
    behavior: reduceMotion.value === 'reduce' ? 'auto' : 'smooth',
  });
});

function onNavWheel(e: WheelEvent) {
  const strip = e.currentTarget;
  if (!(strip instanceof HTMLElement)) return;
  const overflows = strip.scrollWidth > strip.clientWidth;
  const vertical = Math.abs(e.deltaY) >= Math.abs(e.deltaX);
  if (!overflows || !vertical) return;
  e.preventDefault();
  strip.scrollLeft += e.deltaY;
}
</script>

<template>
  <DialogRoot v-model:open="editing" :modal="false" :unmount-on-hide="false">
    <div :class="{ 'is-dragging': dragging }">
      <header ref="header">
        <div class="cd-logo">
          <img v-if="logoUrl" :src="logoUrl" :alt="session.doc.name ?? 'Logo'" />
          <span v-else class="cd-sr-only">{{ session.doc.name ?? 'Logo' }}</span>
        </div>
        <nav aria-label="Sections">
          <ul id="cd-nav" class="cd-main-nav" @wheel="onNavWheel">
            <li v-for="section in sections" :key="section.id">
              <a
                ref="links"
                :href="`#${section.id}`"
                :class="{ selected: current.includes(section.id) }"
                :aria-current="current.includes(section.id) || undefined"
                >{{ section.title }}</a
              >
            </li>
          </ul>
        </nav>
        <div class="cd-actions">
          <SwitchRoot v-if="lightDark" id="theme-toggle" v-model="dark" class="cd-action" title="Dark mode">
            <Icon name="moon" /><span class="cd-action-label">Dark mode</span>
            <span class="cd-switch" aria-hidden="true"><SwitchThumb class="cd-switch-thumb" /></span>
          </SwitchRoot>
          <Listbox
            v-else-if="themes.length > 1"
            id="theme-toggle"
            label="Theme"
            :options="themeOptions"
            :value="theme"
            @update:value="previewTheme"
          />
          <DialogTrigger as-child>
            <Action id="edit-toggle" icon="edit" label="Edit" title="Edit the brand" />
          </DialogTrigger>
          <div class="cd-actions-more">
            <Action
              id="load-btn"
              icon="load"
              label="Load"
              title="Load a brand file, ZIP, fonts or assets"
              @click="loadDialog.open()"
            />
            <Action
              id="save-btn"
              icon="save"
              label="Save JSON"
              title="Save the brand file as JSON"
              @click="save"
            />
          </div>
          <Action
            id="export-btn"
            icon="export"
            label="Export ZIP"
            title="Export the brand kit as a ZIP"
            :busy="exporting"
            @click="exportKit"
          />
        </div>
      </header>
      <Guide
        v-model:current="current"
        :session="session"
        :doc="session.doc"
        :tokens="view.tokens"
        :meta="view.meta"
        :covered="editing && !wide"
        :inset="headerHeight"
      />
      <div class="cd-drop" aria-hidden="true">Drop files to load them</div>
      <DialogContent
        id="cd-drawer"
        as="aside"
        class="cd-drawer"
        :aria-describedby="undefined"
        @interact-outside.prevent
        @open-auto-focus="focusBrandName"
      >
        <div class="cd-drawer-header">
          <DialogTitle>Edit brand</DialogTitle>
          <div class="cd-drawer-actions">
            <Action
              id="undo-btn"
              icon="undo"
              label="Undo"
              title="Undo (Ctrl+Z)"
              aria-keyshortcuts="Control+Z Meta+Z"
              :aria-disabled="!session.store.canUndo()"
              @click="session.store.undo()"
            />
            <Action
              id="redo-btn"
              icon="redo"
              label="Redo"
              title="Redo (Ctrl+Shift+Z)"
              aria-keyshortcuts="Control+Shift+Z Meta+Shift+Z Control+Y"
              :aria-disabled="!session.store.canRedo()"
              @click="session.store.redo()"
            />
            <DialogClose as-child>
              <Action id="drawer-close" icon="close" label="Close" title="Close the editor (Esc)" />
            </DialogClose>
          </div>
        </div>
        <div id="cd-drawer-body" class="cd-drawer-body">
          <Editor
            v-if="editorMounted"
            :session="session"
            :tokens="view.tokens"
            :theme="theme"
            @theme="previewTheme"
          />
        </div>
      </DialogContent>
    </div>
  </DialogRoot>
</template>
