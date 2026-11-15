<script setup lang="ts">
import { computed } from 'vue';
import Card from './Card.vue';
import { cssName } from '~/lib';
import type { Tokens } from '~/lib';
import { dim, radiusText, shadowText } from './parts';

const props = defineProps<{
  tokens: Tokens;
  kind: 'spacing' | 'radius' | 'shadow';
}>();
const steps = computed(() =>
  [...props.tokens].filter(([path]) => path.startsWith(`${props.kind}.`)),
);
const value = (path: string): string => `var(${cssName(path)})`;
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
