<script setup lang="ts">
import { computed } from 'vue';
import { ROLES } from '../../lib/contrast.js';
import { toHex } from '../../lib/color.js';
import * as E from '../../lib/edit.js';
import { paletteColors } from '../../lib/palette.js';
import { VALUES } from '../../lib/schema.js';
import { valueAs } from '../../lib/values.js';
import { COLOR_ERROR } from '../ColorInput.vue';
import { cap } from '../guide/parts.js';
import type { EditorContext } from './context.js';
import { colorOptions, roleEntry, roleText } from './role-color.js';
import RoleColorCombobox from './RoleColorCombobox.vue';

const props = defineProps<{ ctx: EditorContext }>();

const hexOf = (resolved: unknown) => {
  const color = valueAs(VALUES.color, resolved);
  return color ? toHex(color) : '#000000';
};

const shades = computed(() => colorOptions(paletteColors(props.ctx.doc, props.ctx.vendor)));

const roleFields = computed(() =>
  ROLES.map((role) => ({
    role,
    tokens: [...props.ctx.tokens]
      .filter(([path]) => path.startsWith(`color.${role}.`))
      .map(([path, token]) => ({
        path,
        label: cap(path.split('.').slice(1).join(' ').replaceAll('-', ' ')),
        text: roleText(token.value, shades.value),
        hex: hexOf(token.resolved),
      })),
  })).filter((group) => group.tokens.length),
);

function setRole(path: string, text: string) {
  const value = roleEntry(text, shades.value);
  if (!value) return props.ctx.session.warn(`${text.trim() || 'That'}: ${COLOR_ERROR}`);
  props.ctx.edit((doc) => E.setRole(doc, props.ctx.theme, path.slice('color.'.length), value));
}
</script>

<template>
  <p class="cd-hint">Editing the {{ ctx.theme }} theme. Switch the theme in the header to edit the other.</p>
  <div v-for="group in roleFields" :key="group.role">
    <div v-for="{ path, label, text, hex } in group.tokens" :key="path" class="cd-field">
      <span>{{ label }}</span>
      <RoleColorCombobox
        :label="label"
        :text="text"
        :hex="hex"
        :options="shades"
        @commit="setRole(path, $event)"
      />
    </div>
  </div>
</template>
