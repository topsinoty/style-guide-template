<script setup lang="ts">
import { computed } from 'vue';
import Card from './Card.vue';
import { RovingFocusGroup, RovingFocusItem } from 'reka-ui';
import { cssName } from '~/lib';
import type { Tokens } from '~/lib';
import { colorData } from './colors';
import CopyButton from './CopyButton.vue';

const props = defineProps<{ tokens: Tokens; vendor: string }>();
const color = computed(() => colorData(props.tokens, props.vendor));
const background = (path: string) => ({ background: `var(${cssName(path)})` });
</script>

<template>
  <p v-if="!color.hues.length" class="cd-hint">
    No palette colors are defined yet. Colors used by roles or other tokens
    appear below.
  </p>
  <template v-for="[hue, shades] in color.hues" :key="hue">
    <h3 :id="`hue-${hue}`">{{ hue }}</h3>
    <RovingFocusGroup as="ul" class="cd-scale" :aria-labelledby="`hue-${hue}`">
      <li v-for="s in shades" :key="s.path">
        <RovingFocusItem as-child>
          <CopyButton
            :text="s.hex"
            :label="`${s.name}: copy ${s.hex}`"
            class="cd-copy cd-copy-swatch"
          >
            <span class="cd-color-swatch" :style="background(s.path)"></span>
          </CopyButton>
        </RovingFocusItem>
        <b>{{ s.name }}</b>
        <CopyButton
          v-for="copy in s.copies"
          :key="copy.shown"
          :text="copy.text"
          :tabindex="-1"
          class="cd-copy"
        >
          <small>{{ copy.shown }}</small>
        </CopyButton>
        <small v-if="s.description" class="cd-usage">{{ s.description }}</small>
      </li>
    </RovingFocusGroup>
  </template>
  <template v-for="table in color.tables" :key="table.title">
    <h3>{{ table.title }}</h3>
    <Card :label="table.title.toLowerCase()">
      <div class="cd-table-scroll">
        <table class="cd-roles">
          <thead>
            <tr>
              <th>Token</th>
              <th>Value</th>
              <th>Hex</th>
              <th>Usage</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in table.rows" :key="r.path">
              <td>
                <span class="cd-chip" :style="background(r.path)"></span
                ><code>{{ cssName(r.path) }}</code>
              </td>
              <td>
                <code>{{ r.source }}</code>
              </td>
              <td>{{ r.hex }}</td>
              <td>{{ r.description }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </Card>
  </template>
</template>
