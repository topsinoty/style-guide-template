<script setup lang="ts">
import { computed, nextTick, reactive, ref } from 'vue';
import * as E from '../../lib/edit.js';
import { child, children } from '../../lib/tree.js';
import { narrow, isFontFamily, isSize, isTypography } from '../../lib/values.js';
import { cap, dim } from '../guide/parts.js';
import FontPicker from '../FontPicker.vue';
import Choice from './Choice.vue';
import type { EditorContext } from './context.js';
import IconButton from './IconButton.vue';
import NameForm from './NameForm.vue';
import NumberField from './NumberField.vue';
import UploadButton from './UploadButton.vue';
import ItemRow from './ItemRow.vue';
import Scales from './Scales.vue';
import Listbox from '../Listbox.vue';
import { cssName } from '../../lib/css.js';
import { sortFontFiles } from '../../lib/fonts.js';
import { ELEMENTS, elementOf, setElement } from '../../lib/elements.js';

const props = defineProps<{ ctx: EditorContext }>();
const draftWeights = reactive<Record<string, number | undefined>>({});
const newFontFamily = ref('sans-serif');
const catalogOpen = ref(false);
const generic = new Set(['sans-serif', 'serif', 'monospace', 'cursive', 'system-ui']);

const familiesOf = (value: unknown) => [narrow(value, isFontFamily) ?? []].flat();
const aliasOrEmpty = (value: unknown) => (typeof value === 'string' ? value : '');

const fonts = computed(() =>
  children(child(props.ctx.tree, 'font')).map(([name, token]) => ({
    name,
    label: `${cap(name)} font`,
    family: familiesOf(token.$value)[0] ?? '',
  })),
);

const families = computed(() => {
  const uploaded = props.ctx.meta.fontFiles.map((file) => file.family);
  const named = fonts.value.map((font) => font.family).filter(Boolean);
  return [...new Set([...uploaded, ...named, ...generic])].map((family) => ({
    value: family,
    label: family,
  }));
});

const fontOptions = computed(() =>
  fonts.value.map((font) => ({ value: `{font.${font.name}}`, label: font.label })),
);

const sizeOptions = computed(() =>
  children(child(props.ctx.tree, 'font-size')).map(([size, token]) => ({
    value: `{font-size.${size}}`,
    label: `${size} (${dim(token.$value).replace(/(\.\d\d)\d+/, '$1')})`,
  })),
);

const styles = computed(() =>
  children(child(props.ctx.tree, 'typography')).flatMap(([name, token]) => {
    const style = narrow(token.$value, isTypography);
    if (!style) return [];
    return [
      {
        name,
        title: cap(name.replaceAll('-', ' ')),
        element: elementOf(name, token, props.ctx.vendor) ?? '',
        fontFamily: aliasOrEmpty(style.fontFamily),
        fontSize: aliasOrEmpty(style.fontSize),
        fontWeight: typeof style.fontWeight === 'number' ? style.fontWeight : undefined,
        lineHeight: typeof style.lineHeight === 'number' ? style.lineHeight : undefined,
        letterSpacing: narrow(style.letterSpacing, isSize)?.value,
      },
    ];
  }),
);

const opened = ref<string>();
const sortedFiles = computed(() => sortFontFiles(props.ctx.meta.fontFiles));
const labelOf = (options: { value: string; label: string }[], value: string) =>
  options.find((o) => o.value === value)?.label.replace(/ font$/, '') ?? '?';
const styleSummary = (style: (typeof styles.value)[number]) =>
  [
    labelOf(fontOptions.value, style.fontFamily),
    labelOf(sizeOptions.value, style.fontSize),
    style.fontWeight ?? 400,
    style.lineHeight,
  ].join(' · ');
const sampleStyle = (name: string) => {
  const v = (field: string) => `var(${cssName('typography.' + name)}-${field})`;
  return { fontFamily: v('font-family'), fontWeight: v('font-weight') };
};

const elementOptions = [{ value: '', label: 'Nothing' }, ...ELEMENTS];

function applyTo(name: string, element: string) {
  const group = child(props.ctx.tree, 'typography');
  if (group) props.ctx.setToken('typography', setElement(group, name, element, props.ctx.vendor));
}

function put(name: string, patch: Record<string, unknown>) {
  props.ctx.patchValue(`typography.${name}`, patch);
}

function addFont(name: string) {
  const family = newFontFamily.value;
  const fallback = generic.has(family) ? family : 'sans-serif';
  props.ctx.setToken(`font.${name}`, {
    $type: 'fontFamily',
    $value: family === fallback ? [family] : [family, fallback],
  });
}

async function focusNewFont() {
  await nextTick();
  document.getElementById('cd-new-font-name')?.focus();
}

async function uploadFonts(files: File[]) {
  await props.ctx.session.addFontUploads(files);
  if (files.length) {
    newFontFamily.value = E.fontFromFileName(files[0].name).family;
    await focusNewFont();
  }
}

async function pickFonts(files: Parameters<typeof E.addFontFiles>[1]) {
  props.ctx.setMeta((meta) => E.addFontFiles(meta, files));
  if (files.length) newFontFamily.value = files[0].family;
  catalogOpen.value = false;
  await focusNewFont();
}

function styleProblem() {
  if (!fontOptions.value.length) return 'Text styles need a font. Add one under Font families above.';
  if (!sizeOptions.value.length)
    return 'Text styles need a font size. Set the Font size base above, then add steps.';
  return undefined;
}

function addStyle(name: string) {
  if (styleProblem()) return;
  const font = (role: string) => fontOptions.value.find((o) => o.value === `{font.${role}}`);
  const heading = elementOf(name, undefined, props.ctx.vendor)?.startsWith('h');
  const family = (heading ? font('heading') : font('body')) ?? fontOptions.value[0];
  const size = sizeOptions.value.find((o) => o.value === '{font-size.md}') ?? sizeOptions.value[0];
  opened.value = name;
  props.ctx.setToken(`typography.${name}`, {
    $type: 'typography',
    $value: {
      fontFamily: family.value,
      fontSize: size.value,
      fontWeight: 400,
      letterSpacing: { value: 0, unit: 'px' },
      lineHeight: 1.5,
    },
  });
}

function updateWeight(name: string, event: Event) {
  if (event.currentTarget instanceof HTMLInputElement) draftWeights[name] = Number(event.currentTarget.value);
}

function commitWeight(name: string, event: Event) {
  if (!(event.currentTarget instanceof HTMLInputElement)) return;
  props.ctx.patchValue(`typography.${name}`, { fontWeight: Number(event.currentTarget.value) });
  draftWeights[name] = undefined;
}

function setFont(name: string, family: string) {
  const token = child(child(props.ctx.tree, 'font'), name);
  const last = familiesOf(token?.$value).at(-1);
  const fallback = last && generic.has(last) ? last : 'sans-serif';
  props.ctx.setToken(`font.${name}`, {
    ...token,
    $type: 'fontFamily',
    $value: family === fallback ? [family] : [family, fallback],
  });
}

function fontInUse(name: string): boolean {
  return styles.value.some((style) => style.fontFamily === `{font.${name}}`);
}
</script>

<template>
  <div class="ed-group">
    <h4>Font files</h4>
    <p class="cd-hint">
      Upload files or pick from {{ ctx.session.fonts.name }}. A file's name gives its family, weight and
      style.
    </p>
    <div class="cd-field-row">
      <UploadButton label="Upload font files" accept=".woff2,.woff,.ttf,.otf" @files="uploadFonts" />
      <button
        type="button"
        class="btn btn-secondary"
        :aria-expanded="catalogOpen"
        aria-controls="cd-font-catalog"
        @click="catalogOpen = !catalogOpen"
      >
        {{ catalogOpen ? 'Close catalog' : `Browse ${ctx.session.fonts.name}` }}
      </button>
    </div>
    <div v-if="catalogOpen" id="cd-font-catalog">
      <FontPicker :provider="ctx.session.fonts" @pick="pickFonts" @close="catalogOpen = false" />
    </div>
    <ul v-if="ctx.meta.fontFiles.length" class="ed-list">
      <li v-for="file in sortedFiles" :key="file.src" class="ed-row-head">
        <span class="ed-row-text ed-row-pad">
          <span
            class="ed-row-title"
            :style="{ fontFamily: `'${file.family}'`, fontWeight: file.weight, fontStyle: file.style }"
            >{{ file.family }}</span
          >
          <span class="ed-row-meta"
            >{{ file.weight }} {{ file.style }}{{ file.subset ? `, ${file.subset}` : '' }}</span
          >
        </span>
        <IconButton
          name="trash"
          :label="`Remove ${file.family} ${file.weight} ${file.style}`"
          @click="ctx.setMeta((m) => E.removeFontFile(m, file.src))"
        />
      </li>
    </ul>
    <p v-else class="cd-hint">No font files yet. Families without files fall back to the system font.</p>
  </div>

  <div class="ed-group">
    <h4>Font families</h4>
    <p class="cd-hint">
      Name each role a font plays, then pick its family. Text styles below use these names.
    </p>
    <div v-if="fonts.length" class="ed-kv ed-kv-action">
      <template v-for="font in fonts" :key="font.name">
        <span>{{ font.label }}</span>
        <Listbox
          :label="font.label"
          :options="families"
          :value="font.family"
          @update:value="setFont(font.name, $event)"
        />
        <IconButton
          name="trash"
          :label="`Remove ${font.label}`"
          :disabled="fontInUse(font.name)"
          :title="fontInUse(font.name) ? 'A text style uses this font. Change it first.' : undefined"
          @click="ctx.edit((doc) => E.removeToken(doc, `font.${font.name}`))"
        />
      </template>
    </div>
    <NameForm
      label="New font role"
      input-id="cd-new-font-name"
      action="Add font"
      placeholder="mono"
      :taken="fonts.map((font) => font.name)"
      @add="addFont"
    >
      <Choice v-model:value="newFontFamily" label="Family" :options="families" />
    </NameForm>
  </div>

  <Scales :ctx="ctx" :keys="['font-size']" />

  <div class="ed-group">
    <h4>Text styles</h4>
    <ul v-if="styles.length" class="ed-list">
      <ItemRow
        v-for="style in styles"
        :key="style.name"
        :open="opened === style.name"
        :title="style.title"
        :meta="styleSummary(style)"
        :remove-label="`Remove the ${style.title} style`"
        @update:open="(open) => (opened = open ? style.name : undefined)"
        @remove="ctx.edit((doc) => E.removeToken(doc, `typography.${style.name}`))"
      >
        <template #lead>
          <span class="ed-type-sample" :style="sampleStyle(style.name)" aria-hidden="true">Aa</span>
        </template>
        <Choice
          label="Applies to"
          :options="elementOptions"
          :value="style.element"
          @update:value="applyTo(style.name, $event)"
        />
        <div class="ed-grid-2">
          <Choice
            label="Font"
            :options="fontOptions"
            :value="style.fontFamily"
            @update:value="put(style.name, { fontFamily: $event })"
          />
          <Choice
            label="Size"
            :options="sizeOptions"
            :value="style.fontSize"
            @update:value="put(style.name, { fontSize: $event })"
          />
          <label class="cd-field">
            <span>Weight {{ draftWeights[style.name] ?? style.fontWeight ?? 400 }}</span>
            <input
              type="range"
              min="100"
              max="900"
              step="100"
              :value="draftWeights[style.name] ?? style.fontWeight ?? 400"
              @input="updateWeight(style.name, $event)"
              @change="commitWeight(style.name, $event)"
            />
          </label>
          <NumberField
            label="Line height"
            :value="style.lineHeight"
            :min="0"
            @commit="(value) => value > 0 && put(style.name, { lineHeight: value })"
          />
          <NumberField
            label="Letter spacing (px)"
            :value="style.letterSpacing ?? 0"
            @commit="put(style.name, { letterSpacing: { value: $event, unit: 'px' } })"
          />
        </div>
      </ItemRow>
    </ul>
    <div v-if="styleProblem()" class="ed-blocked">
      <p class="cd-hint">{{ styleProblem() }}</p>
    </div>
    <NameForm
      v-else
      label="New text style"
      action="Add style"
      placeholder="caption"
      :taken="styles.map((s) => s.name)"
      @add="addStyle"
    />
  </div>
</template>
