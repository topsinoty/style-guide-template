<script setup lang="ts">
import { computed, ref } from 'vue';
import { checkContrast, ROLES } from '../../lib/contrast.js';
import { toHex } from '../../lib/color.js';
import { cssName } from '../../lib/css.js';
import * as E from '../../lib/edit.js';
import { entriesOf } from '../../lib/records.js';
import { paletteColors, roleFromShade } from '../../lib/palette.js';
import Choice from './Choice.vue';
import { narrow, isColor } from '../../lib/values.js';
import { COLOR_ERROR } from '../ColorInput.vue';
import { cap } from '../guide/parts.js';
import type { EditorContext } from './context.js';
import { colorOptions, roleEntry, roleText } from './role-color.js';
import RoleColorCombobox from './RoleColorCombobox.vue';
import ItemRow from './ItemRow.vue';

const props = defineProps<{ ctx: EditorContext }>();
const opened = ref<string>();

const hexOf = (resolved: unknown) => {
  const color = narrow(resolved, isColor);
  return color ? toHex(color) : '#000000'; // ds-allow-hardcode: picker fallback for an unresolved color
};

const palette = computed(() => paletteColors(props.ctx.doc, props.ctx.vendor));
const shades = computed(() => colorOptions(palette.value));
const fillOptions = computed(() =>
  palette.value.flatMap((c) =>
    c.shades.map((s) => ({ value: `{color.${c.id}.${s.name}}`, label: `${c.id} · ${s.name}` })),
  ),
);

const roles = computed(() =>
  ROLES.map((role) => ({
    role,
    title: cap(role),
    has: (part: string) => props.ctx.tokens.has(`color.${role}.${part}`),
    tokens: [...props.ctx.tokens]
      .filter(([path]) => path.startsWith(`color.${role}.`))
      .map(([path, token]) => ({
        path,
        label: cap(path.split('.').slice(2).join(' ').replaceAll('-', ' ')),
        text: roleText(token.value, shades.value),
        hex: hexOf(token.resolved),
      })),
  })).filter((group) => group.tokens.length),
);

const sample = (role: string, has: (part: string) => boolean) => {
  const part = (name: string) => (has(name) ? `var(${cssName('color.' + role + '.' + name)})` : undefined);
  return { background: part('background'), color: part('foreground'), borderColor: part('border') };
};

const pretty = (text: string) => text.replace(/^\{(color\.)?(.*)\}$/, '$2').replace(' · ', '-');
const contrast = computed(() => checkContrast(props.ctx.doc).filter((r) => r.context === props.ctx.theme));
const summary = (role: string, tokens: { path: string; text: string }[]) => {
  const text = contrast.value.find((r) => r.label === `${role} text`);
  const border = contrast.value.find((r) => r.label === `${role} border on page`);
  const ground = tokens.find((t) => t.path.endsWith('.background')) ?? tokens[0];
  if (text) return `${text.pass ? 'Text' : 'Text too faint,'} ${text.ratio}:1 on ${pretty(ground.text)}`;
  if (border) return `${border.pass ? 'Border' : 'Border too faint,'} ${border.ratio}:1 on the page`;
  return ground ? `Uses ${pretty(ground.text)}` : '';
};

function fill(role: string, option: string) {
  const [, colorId, shade] = /^\{color\.([^.]+)\.([^}]+)\}$/.exec(option) ?? [];
  if (!colorId) return;
  const has = (part: string) => props.ctx.tokens.has(`color.${role}.${part}`);
  // Buttons outline in their own color; surfaces need a visible edge, and fields a 3:1 one.
  let borderSteps = 2;
  if (has('background-hover') || !has('background')) borderSteps = 0;
  else if (role === 'input') borderSteps = 5;
  const parts = roleFromShade(palette.value, colorId, shade, props.ctx.darkPage, borderSteps);
  props.ctx.edit((doc) =>
    entriesOf(parts)
      .filter(([part]) => has(part))
      .reduce((next, [part, value]) => E.setRole(next, props.ctx.theme, `${role}.${part}`, value), doc),
  );
}

function setRole(path: string, text: string) {
  const value = roleEntry(text, shades.value);
  if (!value) return props.ctx.session.warn(`${text.trim() || 'That'}: ${COLOR_ERROR}`);
  props.ctx.edit((doc) => E.setRole(doc, props.ctx.theme, path.slice('color.'.length), value));
}
</script>

<template>
  <p class="cd-hint">
    What the interface uses: page, cards, buttons, alerts. Open a role to point each part at a palette shade
    or any CSS color.
  </p>
  <ul class="ed-list">
    <ItemRow
      v-for="{ role, title, has, tokens } in roles"
      :key="role"
      :open="opened === role"
      :title="title"
      :meta="summary(role, tokens)"
      @update:open="(open) => (opened = open ? role : undefined)"
    >
      <template #lead>
        <span class="ed-role-sample" :style="sample(role, has)" aria-hidden="true">Aa</span>
      </template>
      <Choice
        label="Fill every part from one shade"
        placeholder="Pick a shade"
        :options="fillOptions"
        value=""
        @update:value="fill(role, $event)"
      />
      <div class="ed-kv">
        <template v-for="{ path, label, text, hex } in tokens" :key="path">
          <span>{{ label }}</span>
          <RoleColorCombobox
            :label="`${title} ${label.toLowerCase()}`"
            :text="text"
            :hex="hex"
            :options="shades"
            @commit="setRole(path, $event)"
          />
        </template>
      </div>
    </ItemRow>
  </ul>
</template>
