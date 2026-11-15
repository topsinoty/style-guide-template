<script setup lang="ts">
import AddPanel from './AddPanel.vue';
import { computed, ref, shallowReactive, useId } from 'vue';
import { mainLogo } from '../../lib/assets';
import { COLOR_ERROR, toHex } from '../../lib/color';
import * as E from '../../lib/edit';
import { paletteColors } from '../../lib/palette';
import { extension, fileName } from '../../lib/path';
import type { AssetGroup, AssetItem } from '../../lib/types';
import { isColor, narrow } from '../../lib/values';
import { urlFor } from '../urls';
import Listbox from '../Listbox.vue';
import IconButton from './IconButton.vue';
import ItemRow from './ItemRow.vue';
import { colorOptions, roleEntry, roleText } from './role-color';
import RoleColorCombobox from './RoleColorCombobox.vue';
import TextField from './TextField.vue';
import UploadButton from './UploadButton.vue';
import type { EditorContext } from './context';

const props = defineProps<{ ctx: EditorContext }>();
const picks = shallowReactive(new Map<string, string>());
const opened = ref<string>();
const newGroup = ref('');
const library = computed(() =>
  [...props.ctx.session.library].filter((p) => !p.startsWith('brands/')),
);
const image = /\.(svg|png|jpe?g|gif|webp|avif|ico)$/i;
const logo = computed(() => mainLogo(props.ctx.meta));
const pick = (group: AssetGroup) => picks.get(group.id) ?? '';
const groupName = (group: AssetGroup) => group.label ?? group.id;
const shades = computed(() =>
  colorOptions(paletteColors(props.ctx.doc, props.ctx.vendor)),
);

function hexOf(background: string | undefined) {
  const ref = background && /^\{(.+)\}$/.exec(background);
  const color = narrow(
    ref ? props.ctx.tokens.get(ref[1])?.value : undefined,
    isColor,
  );
  if (color) return toHex(color);
  return background?.startsWith('#') ? background : '#ffffff';
}

function setBackground(group: AssetGroup, item: AssetItem, text: string) {
  if (!text.trim()) {
    props.ctx.setMeta((m) =>
      E.updateItem(m, group.id, item.src, { background: undefined }),
    );
    return;
  }
  const value = roleEntry(text, shades.value);
  if (!value) {
    props.ctx.session.warn(`${text.trim()}: ${COLOR_ERROR}`);
    return;
  }
  const background = typeof value === 'string' ? value : toHex(value);
  props.ctx.setMeta((m) => E.updateItem(m, group.id, item.src, { background }));
}

const count = (n: number) => (n === 1 ? '1 file' : `${n} files`);

function addFromLibrary(group: AssetGroup) {
  const src = pick(group);
  if (src && !group.items.some((item) => item.src === src))
    props.ctx.setMeta((meta) =>
      E.addItems(meta, group.id, [{ label: fileName(src), src }]),
    );
}

function addGroup() {
  const label = newGroup.value.trim();
  if (!label) return false;
  props.ctx.setMeta((meta) => E.addGroup(meta, label));
  newGroup.value = '';
  return true;
}

function rename(group: AssetGroup, event: Event) {
  if (!(event.target instanceof HTMLInputElement)) return;
  const label = event.target.value.trim();
  if (label) props.ctx.setMeta((m) => E.renameGroup(m, group.id, label));
  else event.target.value = groupName(group);
}

async function upload(group: AssetGroup, files: File[], close: () => void) {
  await props.ctx.session.addUploads(files, group.id);
  close();
}

const thumb = (item: AssetItem) => urlFor(item, props.ctx.session.ctx);
const rowKey = (group: AssetGroup, item: AssetItem) =>
  `${group.id}/${item.src}`;
const uid = useId();
</script>

<template>
  <p class="cd-hint">
    Logos, icons and favicons have their own sections in the guide; any other
    group becomes a section of files.
  </p>
  <section
    v-for="(group, g) in ctx.meta.assetGroups"
    :key="group.id"
    class="ed-group"
    :aria-label="groupName(group)"
  >
    <div class="ed-group-head ed-group-bar">
      <label :for="`${uid}-${group.id}`" class="cd-sr-only"
        >Name of the {{ groupName(group) }} group</label
      >
      <input
        :id="`${uid}-${group.id}`"
        class="ed-inline-input ed-group-name"
        type="text"
        :value="groupName(group)"
        @change="rename(group, $event)"
      />
      <span class="cd-hint">{{ count(group.items.length) }}</span>
      <IconButton
        name="move-up"
        :label="`Move ${groupName(group)} up`"
        :disabled="g === 0"
        @click="ctx.setMeta((m) => E.moveGroup(m, group.id, -1))"
      />
      <IconButton
        name="move-down"
        :label="`Move ${groupName(group)} down`"
        :disabled="g === ctx.meta.assetGroups.length - 1"
        @click="ctx.setMeta((m) => E.moveGroup(m, group.id, 1))"
      />
      <IconButton
        name="trash"
        :label="`Remove the ${groupName(group)} group`"
        @click="ctx.setMeta((m) => E.removeGroup(m, group.id))"
      />
    </div>
    <ul v-if="group.items.length" class="ed-list">
      <ItemRow
        v-for="(item, i) in group.items"
        :key="item.src"
        :open="opened === rowKey(group, item)"
        :title="item.label || fileName(item.src)"
        :meta="item.description || item.src"
        :index="i"
        :count="group.items.length"
        :remove-label="`Remove ${item.label || fileName(item.src)}`"
        @update:open="
          (open) => (opened = open ? rowKey(group, item) : undefined)
        "
        @move="
          (dir) => ctx.setMeta((m) => E.moveItem(m, group.id, item.src, dir))
        "
        @remove="ctx.setMeta((m) => E.removeItem(m, group.id, item.src))"
      >
        <template #lead>
          <img
            v-if="thumb(item) && image.test(item.src)"
            class="ed-thumb"
            :src="thumb(item) ?? ''"
            alt=""
          />
          <span v-else class="ed-thumb ed-thumb-file" aria-hidden="true">{{
            extension(item.src)
          }}</span>
        </template>
        <template #badge>
          <span v-if="item.src === logo?.src" class="ed-badge"
            >Header logo</span
          >
        </template>
        <TextField
          label="Label"
          :value="item.label"
          @commit="
            ctx.setMeta((m) =>
              E.updateItem(m, group.id, item.src, { label: $event }),
            )
          "
        />
        <TextField
          label="Description"
          :value="item.description"
          placeholder="When to use it, and on which backgrounds"
          @commit="
            ctx.setMeta((m) =>
              E.updateItem(m, group.id, item.src, {
                description: $event || undefined,
              }),
            )
          "
        />
        <div class="cd-field">
          <span>Background</span>
          <RoleColorCombobox
            :label="`Background of ${item.label || fileName(item.src)}`"
            :text="roleText(item.background, shades)"
            :hex="hexOf(item.background)"
            :options="shades"
            @commit="setBackground(group, item, $event)"
          />
        </div>
        <label
          v-if="group.id === 'logos'"
          :for="`${uid}-${item.src}-wide`"
          class="ed-check"
          ><input
            :id="`${uid}-${item.src}-wide`"
            type="checkbox"
            :checked="item.wide === true"
            @change="
              ctx.setMeta((m) =>
                E.updateItem(m, group.id, item.src, {
                  wide: !item.wide || undefined,
                }),
              )
            "
          />
          Full width</label
        >
        <div class="cd-field-row">
          <span class="cd-hint ed-grow"
            ><code>{{ item.src }}</code></span
          >
          <button
            v-if="item.src !== logo?.src && image.test(item.src)"
            type="button"
            class="btn btn-secondary"
            @click="ctx.setMeta((m) => ({ ...m, logo: item.src }))"
          >
            Use in the header
          </button>
        </div>
      </ItemRow>
    </ul>
    <p v-else class="cd-hint">
      No files yet. Upload some, or drop or paste them anywhere on the page.
    </p>
    <AddPanel label="Add files">
      <template #default="{ close }">
        <div class="ed-add ed-add-files">
          <UploadButton
            :label="`Upload to ${groupName(group)}`"
            @files="(files) => upload(group, files, close)"
          />
          <form
            v-if="library.length"
            class="ed-inline-form"
            @submit.prevent="addFromLibrary(group)"
          >
            <Listbox
              :label="`Library file for ${groupName(group)}`"
              placeholder="Pick a library file"
              :options="library.map((src) => ({ value: src, label: src }))"
              :value="pick(group)"
              @update:value="picks.set(group.id, $event)"
            />
            <button
              type="submit"
              class="btn btn-secondary"
              :disabled="!pick(group)"
            >
              Add from library
            </button>
          </form>
          <button
            type="button"
            class="btn btn-secondary btn-quiet"
            @click="close"
          >
            Cancel
          </button>
          <p class="cd-hint">
            You can also drop or paste files anywhere on the page.
          </p>
        </div>
      </template>
    </AddPanel>
  </section>
  <AddPanel label="Add a group">
    <template #default="{ close }">
      <form class="ed-add" @submit.prevent="addGroup() && close()">
        <label :for="`${uid}-new-group`" class="cd-field"
          ><span>New group</span
          ><input
            :id="`${uid}-new-group`"
            v-model="newGroup"
            type="text"
            placeholder="e.g. Patterns"
        /></label>
        <button type="submit" class="btn">Add group</button>
        <button
          type="button"
          class="btn btn-secondary btn-quiet"
          @click="close"
        >
          Cancel
        </button>
      </form>
    </template>
  </AddPanel>
</template>
