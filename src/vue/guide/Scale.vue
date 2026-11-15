<script setup lang="ts">
import { computed } from 'vue';
import Card from './Card.vue';
import { cssName } from '../../lib/css';
import type { Tokens } from '../../lib/types';
import { narrow, isShadow, isShadowLayer, isSize } from '../../lib/values';
import { dim } from './parts';

const props = defineProps<{
  tokens: Tokens;
  kind: 'spacing' | 'radius' | 'shadow';
}>();
const steps = computed(() =>
  [...props.tokens].filter(([path]) => path.startsWith(`${props.kind}.`)),
);
const value = (path: string): string => `var(${cssName(path)})`;

function shadowText(value: unknown): string {
  const shadow = narrow(value, isShadow);
  const layers = Array.isArray(shadow) ? shadow : [shadow];
  const [first] = layers;
  if (!isShadowLayer(first)) return '';
  const text = [first.offsetX, first.offsetY, first.blur].map(dim).join(' ');
  return layers.length > 1 ? `${text} +${String(layers.length - 1)}` : text;
}

function radiusText(value: unknown): string {
  const radius = narrow(value, isSize);
  if (!radius) return dim(value);
  const px = radius.unit === 'rem' ? radius.value * 16 : radius.value;
  return px >= 9999 ? 'full' : dim(radius);
}
</script>

<template>
  <Card v-if="kind === 'spacing'" class="cd-token-list" label="spacing">
    <div v-for="[path, token] in steps" :key="path" class="cd-token-row">
      <span class="cd-token-caption"
        ><code>{{ cssName(path) }}</code>
        <span class="cd-token-value">{{ dim(token.resolved) }}</span>
        <small v-if="token.description" class="cd-usage">{{
          token.description
        }}</small></span
      >
      <div class="cd-bar" :style="{ width: value(path) }"></div>
    </div>
  </Card>
  <Card
    v-else
    :class="['cd-swatch-grid', { 'cd-shadow-stage': kind === 'shadow' }]"
    :label="kind"
  >
    <figure v-for="[path, token] in steps" :key="path">
      <div
        :class="kind === 'radius' ? 'cd-radius-box' : 'cd-shadow-box'"
        :style="
          kind === 'radius'
            ? { borderRadius: value(path) }
            : { boxShadow: value(path) }
        "
      ></div>
      <figcaption>
        <code>{{ cssName(path) }}</code>
        <span class="cd-token-value">{{
          kind === 'radius'
            ? radiusText(token.resolved)
            : shadowText(token.resolved)
        }}</span>
        <small v-if="token.description" class="cd-usage">{{
          token.description
        }}</small>
      </figcaption>
    </figure>
  </Card>
</template>
