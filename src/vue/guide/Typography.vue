<script setup lang="ts">
import { computed } from 'vue';
import Card from './Card.vue';
import { cssName, cssString } from '~/lib';
import type { BrandMeta, Tokens } from '~/lib';
import { dim } from './parts';
import { fontFamilies, fontSizes, textStyles } from './typography';

const props = defineProps<{ tokens: Tokens; meta: BrandMeta }>();
const sizes = computed(() => fontSizes(props.tokens));
const styles = computed(() => textStyles(props.tokens));
const families = computed(() => fontFamilies(props.meta));
const variable = (p: string, field: string) => `var(${cssName(p)}-${field})`;
</script>

<template>
  <Card label="font sizes">
    <h3>Font sizes</h3>
    <p
      v-for="[path, token] in sizes"
      :key="path"
      class="cd-type-sample"
      :style="{ fontSize: `var(${cssName(path)})` }"
    >
      Aa
      <span class="cd-type-meta"
        ><code>{{ cssName(path) }}</code>
        <span class="cd-token-value">{{ dim(token.resolved) }}</span>
        <small v-if="token.description" class="cd-usage">{{
          token.description
        }}</small></span
      >
    </p>
  </Card>
  <Card label="text styles">
    <h3>Text styles</h3>
    <p
      v-for="{ path, name, summary, description } in styles"
      :key="path"
      class="cd-type-sample"
      :style="{
        fontFamily: variable(path, 'font-family'),
        fontSize: variable(path, 'font-size'),
        fontWeight: variable(path, 'font-weight'),
        letterSpacing: variable(path, 'letter-spacing'),
        lineHeight: variable(path, 'line-height'),
      }"
    >
      {{ name }}
      <span class="cd-type-meta">{{ summary }}</span>
      <small v-if="description" class="cd-usage">{{ description }}</small>
    </p>
  </Card>
  <Card label="fonts">
    <h3>Fonts</h3>
    <template v-if="families.length">
      <div
        v-for="[family, files] in families"
        :key="family"
        class="cd-specimen"
      >
        <b>{{ family }}</b>
        <p
          v-for="file in files"
          :key="file.src"
          :style="{
            fontFamily: cssString(family),
            fontWeight: String(file.weight),
            fontStyle: file.style,
          }"
        >
          {{ file.weight }} {{ file.style }}: The quick brown fox jumps over the
          lazy dog
          <span class="cd-type-meta">{{ file.src }}</span>
        </p>
      </div>
    </template>
    <p v-else>No font files loaded yet.</p>
  </Card>
</template>
