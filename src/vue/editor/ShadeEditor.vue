<script setup lang="ts">
import { computed } from 'vue';
import { PopoverContent, PopoverRoot, PopoverTrigger } from 'reka-ui';
import { cmyk, toHex } from '../../lib/color.js';
import { cssName } from '../../lib/css.js';
import { paletteId, renameShade, setBase, setShade, type Shade } from '../../lib/palette.js';
import { vendorData, withVendorData } from '../../lib/tree.js';
import ColorInput from '../ColorInput.vue';
import type { EditorContext } from './context.js';
import NumberField from './NumberField.vue';
import TextField from './TextField.vue';

const props = defineProps<{ ctx: EditorContext; colorId: string; shade: Shade }>();
const emit = defineEmits<{ remove: [] }>();

const path = computed(() => `color.${props.colorId}.${props.shade.name}`);
const label = computed(() => `${props.colorId}-${props.shade.name}`);
const own = computed(() => vendorData(props.ctx.fresh(path.value), props.ctx.vendor));
const INKS = ['C', 'M', 'Y', 'K'];

const isInkList = (value: unknown): value is number[] =>
  Array.isArray(value) && value.length === 4 && value.every((ink) => typeof ink === 'number');

const storedCmyk = computed(() => (isInkList(own.value.cmyk) ? own.value.cmyk : null));
const printedCmyk = computed(
  () => storedCmyk.value ?? (props.shade.color ? cmyk(props.shade.color) : [0, 0, 0, 0]),
);
const pantone = computed(() => (typeof own.value.pantone === 'string' ? own.value.pantone : ''));
const status = computed(() => {
  if (props.shade.isBase) return 'Base shade';
  return props.shade.byHand ? 'Set by hand' : 'Generated';
});

function rename(name: string) {
  const to = paletteId(name);
  if (to && to !== props.shade.name)
    props.ctx.edit((doc) => renameShade(doc, props.colorId, props.shade.name, to, props.ctx.vendor));
}

function setExtension(patch: Record<string, unknown>) {
  props.ctx.setToken(path.value, withVendorData(props.ctx.fresh(path.value), props.ctx.vendor, patch));
}

function setInk(index: number, value: number) {
  if (value < 0 || value > 100) return;
  const next = [...printedCmyk.value];
  next[index] = value;
  setExtension({ cmyk: next });
}
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger
      class="cd-swatch-button"
      :class="{ 'is-base': shade.isBase, 'is-hand': shade.byHand }"
      :style="{ background: `var(${cssName(path)})` }"
      :aria-label="`Edit ${label}, ${status.toLowerCase()}`"
      :title="label"
    />
    <PopoverContent class="cd-popover" side="bottom" :side-offset="6" :collision-padding="8">
      <h4>{{ label }}</h4>
      <p class="cd-hint">{{ status }}</p>
      <ColorInput
        label="Color"
        :model-value="shade.color ? toHex(shade.color) : ''"
        @commit="ctx.edit((doc) => setShade(doc, colorId, shade.name, $event, ctx.vendor))"
      />
      <TextField label="Name" :value="shade.name" @commit="rename" />
      <fieldset class="cd-print">
        <legend>Print values</legend>
        <div class="cd-field-row cd-cmyk">
          <NumberField
            v-for="(ink, index) in INKS"
            :key="ink"
            :label="ink"
            :value="printedCmyk[index]"
            :min="0"
            :max="100"
            :step="1"
            @commit="setInk(index, $event)"
          />
        </div>
        <p class="cd-hint">
          {{
            storedCmyk
              ? 'CMYK set by hand, 0 to 100 per ink.'
              : 'CMYK approximated from the color. Change any ink to set it by hand.'
          }}
        </p>
        <button
          v-if="storedCmyk"
          type="button"
          class="btn btn-secondary btn-small"
          @click="setExtension({ cmyk: undefined })"
        >
          Use the approximation
        </button>
        <TextField
          label="Pantone"
          :value="pantone"
          placeholder="e.g. PANTONE 2728 C"
          @commit="setExtension({ pantone: $event || undefined })"
        />
      </fieldset>
      <div v-if="!shade.isBase" class="cd-field-row">
        <button
          type="button"
          class="btn btn-secondary btn-small"
          @click="ctx.edit((doc) => setBase(doc, colorId, shade.name, ctx.vendor))"
        >
          Make base
        </button>
        <button type="button" class="btn btn-secondary btn-small" @click="emit('remove')">
          Remove shade
        </button>
      </div>
    </PopoverContent>
  </PopoverRoot>
</template>
