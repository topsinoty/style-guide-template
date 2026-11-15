<script setup lang="ts">
import { CollapsibleContent, CollapsibleRoot, CollapsibleTrigger } from 'reka-ui';
import Icon from '../Icon.vue';
import IconButton from './IconButton.vue';

// One item of a list: a single line that names it, opening to its fields.
const props = defineProps<{
  title: string;
  meta?: string;
  index?: number;
  count?: number;
  removeLabel?: string;
}>();
const emit = defineEmits<{ move: [dir: number]; remove: [] }>();
const open = defineModel<boolean>('open', { default: false });
const movable = () => props.index !== undefined && props.count !== undefined && props.count > 1;
</script>

<template>
  <CollapsibleRoot v-model:open="open" as="li">
    <div class="ed-row-head">
      <CollapsibleTrigger class="ed-row-toggle">
        <slot name="lead" />
        <span class="ed-row-text">
          <span class="ed-row-title">{{ title }}</span>
          <span v-if="meta" class="ed-row-meta">{{ meta }}</span>
        </span>
        <slot name="badge" />
        <Icon name="expand" class="ed-row-chevron" />
      </CollapsibleTrigger>
      <div class="ed-row-actions">
        <slot name="actions" />
        <template v-if="movable()">
          <IconButton
            name="move-up"
            :label="`Move ${title} up`"
            :disabled="index === 0"
            @click="emit('move', -1)"
          />
          <IconButton
            name="move-down"
            :label="`Move ${title} down`"
            :disabled="index === (count ?? 0) - 1"
            @click="emit('move', 1)"
          />
        </template>
        <IconButton v-if="removeLabel" name="trash" :label="removeLabel" @click="emit('remove')" />
      </div>
    </div>
    <CollapsibleContent class="ed-row-body">
      <slot />
    </CollapsibleContent>
  </CollapsibleRoot>
</template>
