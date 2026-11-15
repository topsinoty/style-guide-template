<script setup lang="ts">
import { computed, reactive } from 'vue';
import {
  addScaleStep,
  applyScale,
  removeStep,
  scaleOf,
  setScaleUnit,
  setStep,
  type ScaleSpec,
} from '../../lib/scale.js';
import { DEFAULT_ROOT_SIZE, isRootSize } from '../../lib/assets.js';
import { child, children, isHandSet, withVendorData } from '../../lib/tree.js';
import { keysOf, mapValues, valuesOf } from '../../lib/records.js';
import { narrow, isSize } from '../../lib/values.js';
import type { EditorContext } from './context.js';
import Choice from './Choice.vue';
import IconButton from './IconButton.vue';
import NameForm from './NameForm.vue';
import NumberField from './NumberField.vue';

const props = withDefaults(defineProps<{ ctx: EditorContext; keys?: string[] }>(), {
  keys: () => ['spacing', 'radius'],
});

const SCALES = [
  ['spacing', 'Spacing'],
  ['radius', 'Radius'],
  ['font-size', 'Font sizes'],
] as const;

const pendingUnit = reactive<Record<string, string>>({});

const scales = computed(() =>
  SCALES.filter(([key]) => props.keys.includes(key)).flatMap(([key, label]) => {
    const group = child(props.ctx.tree, key);
    const spec = scaleOf(group, props.ctx.vendor);
    const steps = children(group).map(([step, token]) => ({
      step,
      length: narrow(token.$value, isSize),
      byHand: isHandSet(token, props.ctx.vendor) || !spec || !(step in spec.steps),
    }));
    const unit = spec?.base.unit ?? steps.find((s) => s.length)?.length?.unit ?? pendingUnit[key] ?? 'px';
    return [{ key, label, spec, steps, unit }];
  }),
);

function setBase(key: string, value: number, unit: string) {
  if (!Number.isFinite(value) || value < 0) return;
  const group = child(props.ctx.tree, key) ?? { $type: 'dimension' };
  const spec = scaleOf(group, props.ctx.vendor) ?? { base: { value, unit }, steps: {} };
  const next = withVendorData(group, props.ctx.vendor, {
    scale: { ...spec, base: { ...spec.base, value } },
  });
  props.ctx.setToken(key, applyScale(next, props.ctx.vendor));
}

function setRootSize(value: number) {
  if (!isRootSize(value)) return;
  props.ctx.setMeta(({ rootSize: _, ...meta }) =>
    value === DEFAULT_ROOT_SIZE ? meta : { ...meta, rootSize: value },
  );
}

const STANDARD: Record<string, { linear: Record<string, number>; ratio?: Record<string, number> }> = {
  spacing: { linear: { xs: 1, sm: 2, md: 4, lg: 6, xl: 8, '2xl': 12, '3xl': 16 } },
  radius: { linear: { none: 0, sm: 1, md: 2, lg: 3, xl: 4, full: 9999 } },
  'font-size': {
    linear: { xs: 0.75, sm: 0.875, md: 1, lg: 1.125, xl: 1.25, '2xl': 1.5, '3xl': 1.875, '4xl': 2.25 },
    ratio: { xs: -2, sm: -1, md: 0, lg: 1, xl: 2, '2xl': 3, '3xl': 4, '4xl': 5 },
  },
};

function useStandard(key: string, spec: ScaleSpec | null) {
  if (!spec) return props.ctx.session.warn('Set the base first.');
  const set = STANDARD[key];
  regenerate(key, { steps: (spec.ratio && set.ratio) || set.linear });
}

const UNIT_OPTIONS = [
  { value: 'px', label: 'px' },
  { value: 'rem', label: 'rem' },
];

function setUnit(key: string, unit: string) {
  pendingUnit[key] = unit;
  const group = child(props.ctx.tree, key);
  if (group && (unit === 'px' || unit === 'rem'))
    props.ctx.setToken(key, setScaleUnit(group, unit, props.ctx.vendor, props.ctx.meta.rootSize));
}

function setRatio(key: string, value: number) {
  const spec = scaleOf(child(props.ctx.tree, key), props.ctx.vendor);
  if (!spec) return props.ctx.session.warn('Set the base first.');
  const ratio = value > 0 && value !== 1 ? value : undefined;
  // Steps mean multipliers without a ratio and exponents with one; convert so every size stays put.
  const multiplier = (step: number) => (spec.ratio ? spec.ratio ** step : step);
  const next = mapValues(spec.steps, (step) => {
    const m = multiplier(step);
    return ratio ? Math.round((Math.log(m) / Math.log(ratio)) * 1e4) / 1e4 : Math.round(m * 1e4) / 1e4;
  });
  if (valuesOf(next).some((n) => !Number.isFinite(n)))
    return props.ctx.session.warn('A ratio needs every step above zero.');
  regenerate(key, { ratio, steps: next });
}

function regenerate(key: string, patch: Partial<ScaleSpec>) {
  const group = child(props.ctx.tree, key);
  const spec = scaleOf(group, props.ctx.vendor);
  if (!group || !spec) return;
  const next = withVendorData(group, props.ctx.vendor, { scale: { ...spec, ...patch } });
  props.ctx.setToken(key, applyScale(next, props.ctx.vendor));
}

const newValues = reactive<Record<string, number | ''>>({});

const valueProblem = (key: string) => {
  const spec = scaleOf(child(props.ctx.tree, key), props.ctx.vendor);
  if (!spec) return 'Set the base first.';
  const value = newValues[key];
  const valid = typeof value === 'number' && Number.isFinite(value) && (spec.ratio ? true : value >= 0);
  if (valid) return undefined;
  return spec.ratio ? 'Enter a finite exponent.' : 'Enter a non-negative multiplier.';
};

function addStep(key: string, step: string) {
  const group = child(props.ctx.tree, key);
  const value = newValues[key];
  if (!group || typeof value !== 'number' || valueProblem(key)) return;
  props.ctx.setToken(key, addScaleStep(group, step, value, props.ctx.vendor));
  newValues[key] = '';
}

function remove(key: string, step: string) {
  const group = child(props.ctx.tree, key);
  if (group) props.ctx.setToken(key, removeStep(group, step, props.ctx.vendor));
}

function setValue(key: string, step: string, value: number) {
  const group = child(props.ctx.tree, key);
  const length = narrow(child(group, step)?.$value, isSize);
  if (!group || !length) return;
  props.ctx.setToken(key, setStep(group, step, { ...length, value }, props.ctx.vendor));
}

function setFromInput(key: string, step: string, event: Event) {
  if (!(event.target instanceof HTMLInputElement) || event.target.value === '') return;
  const value = Number(event.target.value);
  if (Number.isFinite(value)) setValue(key, step, value);
}
</script>

<template>
  <p v-if="keys.includes('spacing')" class="cd-hint">
    Each scale grows from its base. Change the base to regenerate every step; edit a step to set it by hand
    (marked with a dot).
  </p>
  <div v-if="keys.includes('spacing')" class="ed-grid-3">
    <NumberField
      label="1rem equals (px)"
      :value="ctx.meta.rootSize ?? DEFAULT_ROOT_SIZE"
      :min="4"
      :max="64"
      @commit="setRootSize"
    />
    <p class="cd-hint ed-span-2">
      Sets the page's root size. 16 is the browser default; 10 makes rem easy to read (1.6rem is 16px).
    </p>
  </div>
  <div
    v-for="{ key, label, spec, steps, unit } in scales"
    :id="`ed-scale-${key}`"
    :key="key"
    class="ed-group"
  >
    <div class="ed-group-head">
      <h4>{{ label }}</h4>
    </div>
    <div class="ed-grid-3">
      <NumberField label="Base" :value="spec?.base.value" :min="0" @commit="setBase(key, $event, unit)" />
      <Choice label="Unit" :options="UNIT_OPTIONS" :value="unit" @update:value="setUnit(key, $event)" />
      <NumberField
        v-if="key === 'font-size'"
        label="Ratio"
        :value="spec?.ratio"
        :min="0"
        optional
        step="any"
        @commit="(value) => setRatio(key, value)"
      />
    </div>
    <ul v-if="steps.length" class="ed-table" :aria-label="`${label} steps`">
      <template v-for="{ step, length, byHand } in steps" :key="step">
        <li v-if="length">
          <span class="ed-table-name"
            ><code>{{ step }}</code
            ><span v-if="byHand" class="ed-dot" title="Set by hand"></span
            ><span v-if="byHand" class="cd-sr-only">set by hand</span></span
          >
          <label class="ed-unit-input"
            ><span class="cd-sr-only">{{ label }} {{ step }} in {{ unit }}</span>
            <input
              type="number"
              step="any"
              :value="length.value"
              @change="setFromInput(key, step, $event)"
            /><span aria-hidden="true">{{ length.unit }}</span></label
          >
          <IconButton
            name="trash"
            :label="`Remove ${label.toLowerCase()} ${step}`"
            @click="remove(key, step)"
          />
        </li>
      </template>
    </ul>
    <div v-else class="ed-blocked">
      <p class="cd-hint">
        {{
          spec
            ? 'No steps yet. Start from the usual set, then adjust or add your own.'
            : 'Set a base to start.'
        }}
      </p>
      <button v-if="spec" type="button" class="btn btn-secondary" @click="useStandard(key, spec)">
        Use standard steps ({{
          keysOf((spec.ratio && STANDARD[key].ratio) || STANDARD[key].linear).join(', ')
        }})
      </button>
    </div>
    <NameForm
      label="New step"
      action="Add step"
      placeholder="4xl"
      :taken="steps.map((s) => s.step)"
      :check="() => valueProblem(key)"
      @add="addStep(key, $event)"
    >
      <label class="cd-field"
        ><span>{{ spec?.ratio ? 'Exponent' : 'Times base' }}</span
        ><input v-model.number="newValues[key]" type="number" :min="spec?.ratio ? undefined : 0" step="any"
      /></label>
    </NameForm>
  </div>
</template>
