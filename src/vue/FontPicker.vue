<script setup lang="ts">
import {
  computed,
  nextTick,
  onMounted,
  reactive,
  ref,
  useTemplateRef,
  watch,
  useId,
} from 'vue';
import { useAsyncState } from '@vueuse/core';
import { errorMessage } from '~/lib';
import type { FontDetail, FontFile, FontListing } from '~/lib';
import type { FontPicks, FontProvider } from '~/ports';
import Listbox from './Listbox.vue';
import Icon from './Icon.vue';

type Detail =
  | { family: string; loading: true }
  | { family: string; error: string }
  | { font: FontDetail };
const props = defineProps<{ provider: FontProvider }>();
const emit = defineEmits<{ pick: [files: FontFile[]]; close: [] }>();
const {
  state: list,
  error: listError,
  execute: load,
} = useAsyncState(() => props.provider.list(), null);
const PAGE = 12;
const category = ref('all');
const query = ref('');
const limit = ref(PAGE);
const detail = ref<Detail | null>(null);
const picked = reactive<FontPicks>({ weights: [], styles: [], subsets: [] });
const search = useTemplateRef<HTMLInputElement>('search');
const heading = useTemplateRef<HTMLElement>('heading');

const label = (c: string) => c[0].toUpperCase() + c.slice(1).replace('-', ' ');
const categories = [
  'all',
  'sans-serif',
  'serif',
  'display',
  'handwriting',
  'monospace',
].map((c) => ({
  value: c,
  label: c === 'all' ? 'All categories' : label(c),
}));
const WEIGHTS: Record<number, string> = {
  100: 'Thin',
  200: 'Extra light',
  300: 'Light',
  400: 'Regular',
  500: 'Medium',
  600: 'Semibold',
  700: 'Bold',
  800: 'Extra bold',
  900: 'Black',
};

const matches = computed(() => {
  const q = query.value.trim().toLowerCase();
  return (list.value ?? []).filter(
    (f) =>
      (category.value === 'all' || f.category === category.value) &&
      f.family.toLowerCase().includes(q),
  );
});
const hits = computed(() => matches.value.slice(0, limit.value));
watch([query, category], () => (limit.value = PAGE));

const status = computed(() => {
  if (listError.value)
    return `${props.provider.name} is unreachable (${errorMessage(listError.value)}). Uploaded and library fonts still work.`;
  if (!list.value) return `Loading the ${props.provider.name} catalog…`;
  const n = matches.value.length;
  if (!n) return 'No fonts match. Try another name or category.';
  return `${n.toLocaleString()} ${n === 1 ? 'font' : 'fonts'}`;
});

const previews = reactive(new Set<string>());
const previewFamily = (font: FontListing) => `cd-preview-${font.id}`;
watch(hits, (fonts) => {
  for (const font of fonts) {
    if (previews.has(font.id)) continue;
    previews.add(font.id);
    const face = new FontFace(
      previewFamily(font),
      `url(${props.provider.previewUrl(font)})`,
    );
    face.load().then(
      (loaded) => document.fonts.add(loaded),
      () => {
        // The name stays in the editor's font.
      },
    );
  }
});

const font = computed(() =>
  detail.value && 'font' in detail.value ? detail.value.font : null,
);
const loading = computed(() =>
  detail.value && 'loading' in detail.value ? detail.value.family : null,
);
const detailError = computed(() =>
  detail.value && 'error' in detail.value ? detail.value.error : null,
);
const files = computed(() =>
  font.value ? props.provider.files(font.value, picked) : [],
);
const count = computed(() =>
  files.value.length === 1 ? '1 file' : `${files.value.length} files`,
);

async function choose(entry: FontListing) {
  detail.value = { family: entry.family, loading: true };
  try {
    const detailed = await props.provider.font(entry.id);
    picked.weights = detailed.weights.filter((w) => w === 400 || w === 700);
    if (!picked.weights.length) picked.weights = detailed.weights.slice(0, 1);
    picked.styles = detailed.styles.filter((s) => s === 'normal');
    if (!picked.styles.length) picked.styles = detailed.styles.slice(0, 1);
    picked.subsets = detailed.subsets.filter((s) => s === detailed.defSubset);
    detail.value = { font: detailed };
  } catch (e) {
    detail.value = {
      family: entry.family,
      error: `Could not load ${entry.family}: ${errorMessage(e)}`,
    };
  }
  await nextTick();
  heading.value?.focus();
}

onMounted(() => search.value?.focus());

async function back() {
  detail.value = null;
  await nextTick();
  search.value?.focus();
}

function submit() {
  if (files.value.length) emit('pick', files.value);
}
const uid = useId();
</script>

<template>
  <div class="ed-catalog">
    <template v-if="!detail">
      <div class="ed-catalog-search">
        <label :for="`${uid}-search`" class="cd-field ed-grow"
          ><span class="cd-sr-only">Search {{ provider.name }} fonts</span
          ><input
            :id="`${uid}-search`"
            ref="search"
            v-model="query"
            type="search"
            placeholder="Search by name"
        /></label>
        <Listbox
          v-model:value="category"
          label="Category"
          :options="categories"
        />
      </div>
      <p class="cd-hint" aria-live="polite">{{ status }}</p>
      <button
        v-if="listError"
        type="button"
        class="btn btn-secondary"
        @click="load()"
      >
        Retry {{ provider.name }}
      </button>
      <ul
        v-if="hits.length"
        class="ed-list"
        :aria-label="`${provider.name} fonts`"
      >
        <li v-for="entry in hits" :key="entry.id">
          <button type="button" class="ed-catalog-hit" @click="choose(entry)">
            <span
              class="ed-catalog-name"
              :style="{
                fontFamily: `'${previewFamily(entry)}', var(--ed-font)`,
              }"
              >{{ entry.family }}</span
            >
            <span class="ed-row-meta"
              >{{ label(entry.category) }} · {{ entry.weights.length }}
              {{ entry.weights.length === 1 ? 'weight' : 'weights'
              }}{{ entry.styles.includes('italic') ? ' · italic' : '' }}</span
            >
            <Icon name="expand" />
          </button>
        </li>
      </ul>
      <button
        v-if="matches.length > hits.length"
        type="button"
        class="btn btn-secondary btn-quiet"
        @click="limit += PAGE"
      >
        Show {{ Math.min(PAGE, matches.length - hits.length) }} more
      </button>
    </template>

    <template v-else>
      <button type="button" class="btn btn-secondary btn-quiet" @click="back">
        ← All fonts
      </button>
      <p v-if="loading" class="cd-hint" aria-live="polite">
        Loading {{ loading }}…
      </p>
      <p v-else-if="detailError" class="cd-error" role="alert">
        {{ detailError }}
      </p>
      <form
        v-else-if="font"
        :key="font.id"
        class="ed-catalog-detail"
        @submit.prevent="submit"
      >
        <h4
          ref="heading"
          tabindex="-1"
          class="ed-catalog-title"
          :style="{ fontFamily: `'cd-preview-${font.id}', var(--ed-font)` }"
        >
          {{ font.family }}
        </h4>
        <fieldset class="ed-chips">
          <legend>Weights</legend>
          <label
            v-for="weight in font.weights"
            :key="weight"
            class="ed-chip-check"
            :for="`${uid}-w${weight}`"
            ><input
              :id="`${uid}-w${weight}`"
              v-model="picked.weights"
              type="checkbox"
              :value="weight"
            />{{ weight }} {{ WEIGHTS[weight] ?? '' }}</label
          >
        </fieldset>
        <fieldset v-if="font.styles.length > 1" class="ed-chips">
          <legend>Styles</legend>
          <label
            v-for="style in font.styles"
            :key="style"
            :for="`${uid}-s${style}`"
            class="ed-chip-check"
            ><input
              :id="`${uid}-s${style}`"
              v-model="picked.styles"
              type="checkbox"
              :value="style"
            />{{ label(style) }}</label
          >
        </fieldset>
        <fieldset v-if="font.subsets.length > 1" class="ed-chips">
          <legend>Character sets</legend>
          <label
            v-for="subset in font.subsets"
            :key="subset"
            class="ed-chip-check"
            :for="`${uid}-c${subset}`"
            ><input
              :id="`${uid}-c${subset}`"
              v-model="picked.subsets"
              type="checkbox"
              :value="subset"
            />{{ label(subset) }}</label
          >
        </fieldset>
        <div class="cd-field-row">
          <button type="submit" class="btn" :disabled="!files.length">
            Add {{ count }}
          </button>
          <button
            type="button"
            class="btn btn-secondary btn-quiet"
            @click="emit('close')"
          >
            Cancel
          </button>
        </div>
      </form>
    </template>
  </div>
</template>
