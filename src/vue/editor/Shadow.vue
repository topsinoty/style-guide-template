<script setup lang="ts">
import { computed, ref } from 'vue';
import {
  toHex,
  defaultTheme,
  removeThemed,
  removeToken,
  setThemed,
  themeSource,
  child,
  children,
  isNode,
  entriesOf,
  keysOf,
  narrow,
  isColor,
  isSize,
  cssName,
} from '~/lib';
import ColorInput from '../ColorInput.vue';
import type { EditorContext } from './context';
import NameForm from './NameForm.vue';
import NumberField from './NumberField.vue';
import ItemRow from './ItemRow.vue';
import IconButton from './IconButton.vue';
import { cap } from '../guide/parts';
import type { Dimension, DtcgColor, TokenNode } from '~/lib';

const props = defineProps<{ ctx: EditorContext }>();

const px = (value: number) => ({ value, unit: 'px' });
const layer = (
  alpha: number,
  y: number,
  blur: number,
  { spread = 0, lightness = 0 } = {},
) => ({
  color: { colorSpace: 'oklch', components: [lightness, 0, 0], alpha },
  offsetX: px(0),
  offsetY: px(y),
  blur: px(blur),
  spread: px(spread),
});
const ring = (alpha: number) => layer(alpha, 0, 0, { spread: 1, lightness: 1 });
const STANDARD = {
  light: {
    sm: [layer(0.05, 1, 1)],
    md: [layer(0.1, 2, 8)],
    lg: [layer(0.15, 8, 24)],
  },
  dark: {
    sm: [layer(0.4, 1, 2), ring(0.08)],
    md: [layer(0.5, 2, 8), ring(0.1)],
    lg: [layer(0.6, 8, 24), ring(0.12)],
  },
};

const fallback = computed(() => defaultTheme(props.ctx.doc) ?? props.ctx.theme);
const isDefault = computed(() => props.ctx.theme === fallback.value);
const own = computed(() =>
  child(themeSource(props.ctx.doc, props.ctx.theme), 'shadow'),
);

const readLayer = (value: unknown) =>
  isNode(value)
    ? {
        offsetX: narrow(value.offsetX, isSize),
        offsetY: narrow(value.offsetY, isSize),
        blur: narrow(value.blur, isSize),
        spread: narrow(value.spread, isSize),
        color: narrow(value.color, isColor),
      }
    : null;

const shadows = computed(() => {
  const base = child(props.ctx.tree, 'shadow');
  const names = [
    ...new Set(
      [...children(base), ...children(own.value)].map(([name]) => name),
    ),
  ];

  return names.flatMap((name) => {
    const mine = child(own.value, name);
    const token = mine ?? child(base, name);

    if (!token) {
      return [];
    }

    const raw = Array.isArray(token.$value) ? token.$value : [token.$value];
    const layers = raw.map(readLayer);

    if (layers.some((l) => !l)) {
      return [];
    }

    return [
      {
        name,
        token,
        layers: layers.flatMap((l) => (l ? [l] : [])),
        inherited: !isDefault.value && !mine,
      },
    ];
  });
});

const opened = ref<string>();
const summary = (
  layers: {
    offsetX: Dimension | null;
    offsetY: Dimension | null;
    blur: Dimension | null;
  }[],
) => {
  const [first] = layers;
  const text = [first.offsetX, first.offsetY, first.blur]
    .map((d) => (d ? `${d.value}${d.unit}` : '?'))
    .join(' ');

  return layers.length > 1 ? `${text} + ${layers.length - 1} more` : text;
};

function write(
  name: string,
  token: TokenNode,
  values: unknown[],
  inherited: boolean,
) {
  const $value = values.length === 1 ? values[0] : values;
  const next = inherited
    ? { $type: 'shadow', ...token, $value }
    : { ...token, $value };

  props.ctx.edit((doc) =>
    setThemed(doc, props.ctx.theme, `shadow.${name}`, next),
  );
}

const rawLayers = (token: TokenNode) =>
  structuredClone(Array.isArray(token.$value) ? token.$value : [token.$value]);

function put(name: string, i: number, patch: Record<string, unknown>) {
  const row = shadows.value.find((s) => s.name === name);

  if (!row) {
    return;
  }

  const values = rawLayers(row.token);
  const current = values[i];

  values[i] = { ...(isNode(current) ? current : {}), ...patch };
  write(name, row.token, values, row.inherited);
}

function addLayer(name: string) {
  const row = shadows.value.find((s) => s.name === name);

  if (row) {
    write(
      name,
      row.token,
      [...rawLayers(row.token), layer(0.1, 0, 0, { spread: 1 })],
      row.inherited,
    );
  }
}

function removeLayer(name: string, i: number) {
  const row = shadows.value.find((s) => s.name === name);

  if (row) {
    write(name, row.token, rawLayers(row.token).toSpliced(i, 1), row.inherited);
  }
}

function remove(name: string) {
  props.ctx.edit((doc) =>
    isDefault.value
      ? removeToken(doc, `shadow.${name}`)
      : removeThemed(doc, props.ctx.theme, `shadow.${name}`),
  );
}

const allInherited = computed(
  () => shadows.value.length > 0 && shadows.value.every((s) => s.inherited),
);
const standard = computed(() =>
  props.ctx.darkPage ? STANDARD.dark : STANDARD.light,
);

function useStandard() {
  const group: TokenNode = { $type: 'shadow' };

  for (const [name, layers] of entriesOf(standard.value)) {
    group[name] = { $value: layers.length === 1 ? layers[0] : layers };
  }

  props.ctx.edit((doc) => setThemed(doc, props.ctx.theme, 'shadow', group));
}

function addShadow(name: string) {
  props.ctx.setToken(`shadow.${name}`, {
    $type: 'shadow',
    $value: layer(0.1, 2, 4),
  });
}
</script>

<template>
  <p class="cd-hint">
    Open a shadow to change its offset, blur and color. Stack layers for a
    deeper shadow or a light edge.
  </p>
  <ul v-if="shadows.length" class="ed-list">
    <ItemRow
      v-for="{ name, layers, inherited } in shadows"
      :key="name"
      :open="opened === name"
      :title="name"
      :meta="summary(layers)"
      :remove-label="
        isDefault
          ? `Remove shadow ${name}`
          : inherited
            ? undefined
            : `Use the default theme's ${name}`
      "
      @update:open="(open) => (opened = open ? name : undefined)"
      @remove="remove(name)"
    >
      <template #lead>
        <span
          class="ed-shadow-chip"
          :style="{ boxShadow: `var(${cssName(`shadow.${name}`)})` }"
        ></span>
      </template>
      <template v-if="!isDefault" #badge>
        <span v-if="!inherited" class="ed-badge">{{ ctx.theme }}</span>
      </template>
      <p v-if="inherited" class="cd-hint">
        Same as the default theme. A change here applies to
        {{ ctx.theme }} only.
      </p>
      <fieldset
        v-for="({ offsetX, offsetY, blur, spread, color }, i) in layers"
        :key="i"
        class="ed-layer"
      >
        <legend v-if="layers.length > 1">
          Layer {{ i + 1 }}
          <IconButton
            name="trash"
            :label="`Remove layer ${i + 1} of ${name}`"
            @click="removeLayer(name, i)"
          />
        </legend>
        <div class="ed-grid-4">
          <NumberField
            v-if="offsetX"
            label="X (px)"
            :value="offsetX.value"
            @commit="put(name, i, { offsetX: px($event) })"
          />
          <NumberField
            v-if="offsetY"
            label="Y (px)"
            :value="offsetY.value"
            @commit="put(name, i, { offsetY: px($event) })"
          />
          <NumberField
            v-if="blur"
            label="Blur (px)"
            :value="blur.value"
            @commit="(value) => value >= 0 && put(name, i, { blur: px(value) })"
          />
          <NumberField
            v-if="spread"
            label="Spread (px)"
            :value="spread.value"
            @commit="put(name, i, { spread: px($event) })"
          />
        </div>
        <div v-if="color" class="ed-grid-2">
          <ColorInput
            label="Color"
            :model-value="toHex(color)"
            @commit="
              (next: DtcgColor) =>
                put(name, i, { color: { ...next, alpha: color.alpha } })
            "
          />
          <NumberField
            label="Opacity (0 to 1)"
            :value="color.alpha ?? 1"
            :min="0"
            :max="1"
            :step="0.05"
            @commit="
              (value) =>
                value >= 0 &&
                value <= 1 &&
                put(name, i, { color: { ...color, alpha: value } })
            "
          />
        </div>
      </fieldset>
      <button
        type="button"
        class="btn btn-secondary btn-quiet ed-add-layer"
        @click="addLayer(name)"
      >
        Add layer
      </button>
    </ItemRow>
  </ul>
  <div
    v-if="isDefault ? !shadows.length : ctx.darkPage && allInherited"
    class="ed-blocked"
  >
    <p class="cd-hint">
      {{
        shadows.length
          ? `${cap(ctx.theme)} uses the default theme's shadows, which barely show on a dark page.`
          : 'No shadows yet. Start from the usual set, then adjust or add your own.'
      }}
    </p>
    <button type="button" class="btn btn-secondary" @click="useStandard">
      Use standard {{ ctx.darkPage ? 'dark ' : '' }}shadows ({{
        keysOf(standard).join(', ')
      }})
    </button>
  </div>
  <NameForm
    v-if="isDefault"
    label="New shadow"
    action="Add shadow"
    placeholder="xl"
    :taken="shadows.map((s) => s.name)"
    @add="addShadow"
  />
  <div v-else-if="!shadows.length" class="ed-blocked">
    <p class="cd-hint">
      New shadows start in the default theme; each theme can then change its
      own.
    </p>
    <button
      type="button"
      class="btn btn-secondary"
      @click="ctx.setTheme(fallback)"
    >
      Edit {{ fallback }} shadows
    </button>
  </div>
</template>
