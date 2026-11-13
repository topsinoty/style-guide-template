<script setup lang="ts">
import { computed, ref, shallowReactive } from 'vue';
import { useFileDialog } from '@vueuse/core';
import {
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogOverlay,
  DialogPortal,
  DialogRoot,
  DialogTitle,
} from 'reka-ui';
import { injectSession } from '../useSession.js';
import Icon from '../Icon.vue';
import Listbox from '../Listbox.vue';

defineProps<{ missing: string[] }>();
const session = injectSession();
const newGroup = '__new';
const pendingTarget = ref<string | null>(null);
const targets = shallowReactive(new WeakMap<File, string>());
const options = computed(() => [
  ...session.value.meta.assetGroups.map((g) => ({ value: g.id, label: g.label ?? g.id })),
  { value: newGroup, label: 'New group: Uploads' },
]);
const target = computed({
  get: () =>
    options.value.find((o) => o.value === pendingTarget.value)?.value ?? options.value[0]?.value ?? newGroup,
  set: (value) => (pendingTarget.value = value),
});
const warnings = computed(() =>
  session.value.store.saveError
    ? [...session.value.warnings, 'Your edits could not be saved in this browser. Save JSON to keep them.']
    : session.value.warnings,
);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;
const targetFor = (file: File, candidates: string[]) => targets.get(file) ?? candidates[0];
const missingDialog = useFileDialog({ reset: true });
missingDialog.onChange(async (files) => {
  if (files) await session.value.receive([...files]);
});
</script>

<template>
  <div v-if="warnings.length" class="cd-box cd-panel" role="alert">
    <h2>Warnings</h2>
    <ul>
      <li v-for="warning in warnings" :key="warning">
        <span class="cd-status is-warn"><Icon name="alert" /></span> {{ warning }}
      </li>
    </ul>
    <button type="button" class="btn btn-secondary btn-small" @click="session.dismissWarnings()">
      Dismiss
    </button>
  </div>
  <DialogRoot :open="session.pending.length > 0" @update:open="(open) => open || session.discardPending()">
    <DialogPortal>
      <DialogOverlay class="cd-confirm-overlay" />
      <DialogContent class="cd-confirm">
        <DialogTitle as="h2">Add {{ plural(session.pending.length, 'file') }}</DialogTitle>
        <DialogDescription>Choose the asset group they belong to.</DialogDescription>
        <ul class="cd-confirm-items">
          <li v-for="file in session.pending" :key="file.name">
            <code>{{ file.name }}</code>
          </li>
        </ul>
        <div class="cd-field">
          <span>Group</span><Listbox v-model:value="target" label="Asset group" :options="options" />
        </div>
        <div class="cd-field-row">
          <DialogClose class="btn btn-secondary btn-small">Discard</DialogClose>
          <button
            type="button"
            class="btn btn-small"
            @click="session.addPending(target === newGroup ? null : target)"
          >
            Add files
          </button>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
  <div v-if="missing.length" class="cd-box cd-panel">
    <h2>Missing files</h2>
    <p>
      This brand refers to files that are not loaded. Drop them anywhere on the page or choose them; they are
      matched by file name.
    </p>
    <ul>
      <li v-for="item in missing" :key="item">
        <code>{{ item }}</code>
      </li>
    </ul>
    <div v-for="{ file, candidates } in session.ambiguous" :key="file.name" class="cd-field-row">
      <div class="cd-field">
        <span>{{ file.name }} matches more than one file</span>
        <Listbox
          :label="`Where does ${file.name} go?`"
          :options="candidates.map((c) => ({ value: c, label: c }))"
          :value="targetFor(file, candidates)"
          @update:value="targets.set(file, $event)"
        />
      </div>
      <button type="button" class="btn btn-small" @click="session.assign(file, targetFor(file, candidates))">
        Use here
      </button>
    </div>
    <button type="button" class="btn btn-secondary btn-small" @click="missingDialog.open()">
      Choose files
    </button>
  </div>
</template>
