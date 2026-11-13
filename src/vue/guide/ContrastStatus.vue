<script setup lang="ts">
import { computed } from 'vue';
import { PopoverContent, PopoverPortal, PopoverRoot, PopoverTrigger } from 'reka-ui';
import type { ContrastResult } from '../../lib/types.js';
import Icon from '../Icon.vue';

const props = defineProps<{ contrast: ContrastResult[] }>();

const failures = computed(() => props.contrast.filter((pair) => !pair.pass).length);
const summary = computed(() => {
  if (!failures.value) return `All ${props.contrast.length} contrast pairs pass`;
  return failures.value === 1 ? '1 contrast pair fails' : `${failures.value} contrast pairs fail`;
});
</script>

<template>
  <PopoverRoot>
    <PopoverTrigger class="cd-contrast-button" :class="failures ? 'is-warn' : 'is-pass'">
      <Icon :name="failures ? 'alert' : 'check'" />
      <span>{{ summary }}</span>
    </PopoverTrigger>
    <PopoverPortal>
      <PopoverContent class="cd-popover cd-contrast-popover" side="top" align="start" :side-offset="8">
        <h4>Contrast</h4>
        <table class="cd-roles">
          <thead>
            <tr>
              <th>Theme</th>
              <th>Pair</th>
              <th>Ratio</th>
              <th>Minimum</th>
              <th>Result</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="pair in contrast" :key="`${pair.context}-${pair.fg}-${pair.bg}`">
              <td>{{ pair.context }}</td>
              <td>{{ pair.label }}</td>
              <td>{{ pair.ratio }}:1</td>
              <td>{{ pair.min }}:1</td>
              <td>
                <span class="cd-status" :class="pair.pass ? 'is-pass' : 'is-warn'"
                  ><Icon :name="pair.pass ? 'check' : 'alert'" />{{ pair.pass ? 'Pass' : 'Fails' }}</span
                >
              </td>
            </tr>
          </tbody>
        </table>
      </PopoverContent>
    </PopoverPortal>
  </PopoverRoot>
</template>
