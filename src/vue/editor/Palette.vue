<script setup lang="ts">
import AddPanel from './AddPanel.vue';
import { computed, ref } from 'vue';
import { PopoverContent, PopoverRoot, PopoverTrigger } from 'reka-ui';
import { parseCssColor } from '../../lib/color.js';
import { ROLES } from '../../lib/contrast.js';
import {
  addColor,
  generateShades,
  handSetShades,
  moveColor,
  paletteColors,
  paletteId,
  referencesTo,
  removeColor,
  removeShade,
  renameColor,
} from '../../lib/palette.js';
import ColorInput, { COLOR_ERROR } from '../ColorInput.vue';
import Icon from '../Icon.vue';
import Confirm, { type ConfirmChoice } from '../Confirm.vue';
import { cap } from '../guide/parts.js';
import type { EditorContext } from './context.js';
import IconButton from './IconButton.vue';
import AddShadeForm from './AddShadeForm.vue';
import ShadeEditor from './ShadeEditor.vue';

interface Question {
  title: string;
  message: string;
  items: string[];
  choices: ConfirmChoice[];
  run: (choice: string) => void;
}

const props = defineProps<{ ctx: EditorContext }>();

const colors = computed(() => paletteColors(props.ctx.doc, props.ctx.vendor));

const question = ref<Question>();
const addingTo = ref<Record<string, boolean>>({});
const renaming = ref<Record<string, boolean>>({});
const renameDraft = ref<Record<string, string>>({});
const draftName = (id: string, event: Event) => {
  if (event.target instanceof HTMLInputElement) renameDraft.value[id] = event.target.value;
};
const renameError = ref<Record<string, string>>({});
const asking = ref(false);

function ask(next: Question) {
  question.value = next;
  asking.value = true;
}

function describeReferences(colorId: string, shades?: string[]) {
  return referencesTo(props.ctx.doc, colorId, shades).map((ref) =>
    ref.context === 'foundation' ? ref.path : `${ref.path} (${ref.context})`,
  );
}

function confirmRemoval(name: string, items: string[], run: () => void) {
  if (!items.length) return run();
  ask({
    title: `Remove ${name}?`,
    message: 'These tokens use it. They keep the color they show now, as a fixed value.',
    items,
    choices: [{ value: 'remove', label: `Remove ${name}`, primary: true }],
    run,
  });
}

function removeWholeColor(id: string) {
  confirmRemoval(id, describeReferences(id), () => props.ctx.edit((doc) => removeColor(doc, id)));
}

function removeOneShade(id: string, shade: string) {
  confirmRemoval(`${id}-${shade}`, describeReferences(id, [shade]), () =>
    props.ctx.edit((doc) => removeShade(doc, id, shade, props.ctx.vendor)),
  );
}

function generate(id: string) {
  const run = (mode: string) =>
    props.ctx.edit((doc) =>
      generateShades(doc, id, props.ctx.vendor, mode === 'overwrite' ? 'overwrite' : 'keep'),
    );
  const handSet = handSetShades(props.ctx.doc, id, props.ctx.vendor);
  if (!handSet.length) return run('keep');
  ask({
    title: `Regenerate ${id} shades?`,
    message: 'These shades were set by hand. Keep them as they are, or replace them with generated ones.',
    items: handSet.map((shade) => `${id}-${shade}`),
    choices: [
      { value: 'overwrite', label: 'Replace them' },
      { value: 'keep', label: 'Keep hand-set shades', primary: true },
    ],
    run,
  });
}

const newName = ref('');
const newColor = ref('');
const withShades = ref(true);
const nameError = ref<string>();
const colorError = ref<string>();

function colorNameProblem(id: string) {
  if (!id) return 'Give the color a name.';
  if (ROLES.includes(id) || colors.value.some((color) => color.id === id)) return `${id} is already taken.`;
  return undefined;
}

function prepareRename(id: string, open: boolean) {
  if (!open) return;
  renameDraft.value[id] = id;
  renameError.value[id] = '';
}

function renamePaletteColor(from: string) {
  const to = paletteId(renameDraft.value[from] ?? from);
  if (to === from) {
    renaming.value[from] = false;
    return;
  }
  renameError.value[from] = colorNameProblem(to) ?? '';
  if (renameError.value[from]) return;
  props.ctx.edit((doc) => renameColor(doc, from, to));
  renaming.value[from] = false;
}

function addNewColor() {
  const id = paletteId(newName.value);
  const value = parseCssColor(newColor.value.trim());
  nameError.value = colorNameProblem(id);
  colorError.value = value ? undefined : COLOR_ERROR;
  if (nameError.value || !value) return false;
  props.ctx.edit((doc) => {
    const added = addColor(doc, id, value, props.ctx.vendor);
    return withShades.value ? generateShades(added, id, props.ctx.vendor, 'keep') : added;
  });
  newName.value = '';
  newColor.value = '';
  return true;
}
</script>

<template>
  <p v-if="colors.length" class="cd-hint">
    Select a shade to edit it. The outlined shade is the base the others are generated from; a dot marks a
    shade set by hand.
  </p>
  <p v-if="!colors.length" class="cd-hint">
    No palette colors yet. Add one below; roles can still use any CSS color.
  </p>
  <section
    v-for="(color, i) in colors"
    :key="color.id"
    class="ed-group"
    :aria-label="`${cap(color.id)} color`"
  >
    <div class="ed-group-head">
      <h4>{{ cap(color.id) }}</h4>
      <span class="cd-hint"
        >{{ color.shades.length }} {{ color.shades.length === 1 ? 'shade' : 'shades' }}</span
      >
      <PopoverRoot v-model:open="renaming[color.id]" @update:open="prepareRename(color.id, $event)">
        <PopoverTrigger class="cd-action" :aria-label="`Rename ${color.id}`" :title="`Rename ${color.id}`">
          <Icon name="edit" />
        </PopoverTrigger>
        <PopoverContent class="cd-popover" side="bottom" align="end" :side-offset="6">
          <form class="ed-popover-form" @submit.prevent="renamePaletteColor(color.id)">
            <label class="cd-field">
              <span>Color name</span>
              <input
                :value="renameDraft[color.id] ?? color.id"
                type="text"
                :aria-invalid="renameError[color.id] ? 'true' : undefined"
                @input="draftName(color.id, $event)"
              />
            </label>
            <p v-if="renameError[color.id]" class="cd-error" role="alert">{{ renameError[color.id] }}</p>
            <button type="submit" class="btn">Rename</button>
          </form>
        </PopoverContent>
      </PopoverRoot>
      <IconButton
        name="move-up"
        :label="`Move ${color.id} up`"
        :disabled="i === 0"
        @click="ctx.edit((doc) => moveColor(doc, color.id, -1))"
      />
      <IconButton
        name="move-down"
        :label="`Move ${color.id} down`"
        :disabled="i === colors.length - 1"
        @click="ctx.edit((doc) => moveColor(doc, color.id, 1))"
      />
      <IconButton name="trash" :label="`Remove ${color.id}`" @click="removeWholeColor(color.id)" />
    </div>
    <ol class="cd-mini-scale" :aria-label="`${color.id} shades`">
      <li v-for="shade in color.shades" :key="shade.name">
        <ShadeEditor
          :ctx="ctx"
          :color-id="color.id"
          :shade="shade"
          @remove="removeOneShade(color.id, shade.name)"
        />
      </li>
    </ol>
    <div class="cd-field-row">
      <button type="button" class="btn btn-secondary btn-quiet" @click="generate(color.id)">
        {{ color.shades.length === 1 ? 'Generate shades 50 to 950' : 'Regenerate shades' }}
      </button>
      <PopoverRoot v-model:open="addingTo[color.id]">
        <PopoverTrigger class="btn btn-secondary btn-quiet">Add shade</PopoverTrigger>
        <PopoverContent
          class="cd-popover"
          side="bottom"
          align="start"
          :side-offset="6"
          :collision-padding="8"
        >
          <AddShadeForm :ctx="ctx" :color="color" @added="addingTo[color.id] = false" />
        </PopoverContent>
      </PopoverRoot>
    </div>
  </section>
  <AddPanel label="Add a color">
    <template #default="{ close }">
      <form class="ed-add" @submit.prevent="addNewColor() && close()">
        <label class="cd-field"
          ><span>New color</span>
          <input
            v-model="newName"
            type="text"
            placeholder="e.g. accent"
            :aria-invalid="nameError ? 'true' : undefined"
            :aria-describedby="nameError ? 'new-color-name-error' : undefined"
            @input="nameError = undefined"
          />
          <span v-if="nameError" id="new-color-name-error" class="cd-error">{{ nameError }}</span>
        </label>
        <ColorInput
          v-model="newColor"
          label="Base color"
          placeholder="e.g. #2e59aa"
          :error="colorError"
          @update:model-value="colorError = undefined"
        />
        <label class="ed-check"
          ><input v-model="withShades" type="checkbox" /> Generate shades 50 to 950 around it</label
        >
        <button type="submit" class="btn">Add color</button>
        <button type="button" class="btn btn-secondary btn-quiet" @click="close">Cancel</button>
      </form>
    </template>
  </AddPanel>
  <Confirm
    v-if="question"
    v-model:open="asking"
    :title="question.title"
    :message="question.message"
    :items="question.items"
    :choices="question.choices"
    @choose="question.run"
  />
</template>
