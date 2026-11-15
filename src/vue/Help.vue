<script setup lang="ts">
import { DialogClose, DialogContent, DialogOverlay, DialogPortal, DialogRoot, DialogTitle } from 'reka-ui';
import Icon from './Icon.vue';

defineProps<{ editable: boolean }>();
const open = defineModel<boolean>('open', { required: true });
const emit = defineEmits<{ tour: [] }>();
</script>

<template>
  <DialogRoot v-model:open="open">
    <DialogPortal>
      <DialogOverlay class="cd-help-overlay" />
      <DialogContent class="cd-help" :aria-describedby="undefined">
        <div class="cd-help-head">
          <DialogTitle>Help</DialogTitle>
          <DialogClose class="cd-action" title="Close help (Esc)">
            <Icon name="close" /><span class="cd-action-label">Close</span>
          </DialogClose>
        </div>
        <div class="cd-help-body">
          <p>
            This page is a brand book. Everything on it, from colors to fonts to logos, comes from one brand
            file in the W3C Design Tokens format.
          </p>
          <button type="button" class="btn" @click="emit('tour')">Take the tour</button>

          <h3>Reading the brand book</h3>
          <ul>
            <li><strong>Sections:</strong> the links at the top jump to each part of the page.</li>
            <li>
              <strong>Inspect:</strong> hover over any text, or select it, to see its HTML element, the text
              style applied to it, and its font, weight, size and line height.
            </li>
            <li>
              <strong>Themes:</strong> the switch at the top shows the brand in each of its themes, such as
              light and dark.
            </li>
            <li>
              <strong>Copy values:</strong> the buttons beside each color copy its hex, RGBA, OKLCH or CMYK
              value.
            </li>
            <li>
              <strong>Contrast:</strong> the badge in the corner says whether every required pair passes. Open
              it to see each role's text on its background, and input and focus borders on the page, in every
              theme, with the ratio and the minimum.
            </li>
            <li>
              <strong>Code:</strong> the last section shows the brand as CSS variables, a Tailwind v4 theme,
              or shadcn/ui variables, ready to copy.
            </li>
            <li>
              <strong>Save JSON</strong> downloads the brand file. <strong>Export ZIP</strong> downloads a
              brand kit: the brand file, <code>css/theme.css</code>, the fonts with their licenses, every
              asset group in its own folder, and a README.
            </li>
          </ul>

          <template v-if="editable">
            <h3>Editing</h3>
            <p>
              <strong>Edit</strong> opens the editor beside the page. Its tabs follow the order a brand is
              built in:
            </p>
            <dl>
              <dt>Brand</dt>
              <dd>
                The name and introduction; the guide's sections, with text of your own and in any order; usage
                notes on any token; and Start again, which replaces the brand with a preset or clears it to
                black and white.
              </dd>
              <dt>Color</dt>
              <dd>
                The palette, where a new color gets shades from 50 to 950; roles such as page, card and
                primary, which the interface uses; extra contrast pairs to check; and themes. Color edits
                apply to the theme chosen under “Editing colors for”.
              </dd>
              <dt>Type</dt>
              <dd>
                Font files from Fontsource or your own uploads, font families, the font-size scale, and text
                styles. “Applies to” makes a text style dress an element such as Heading 1 or Paragraph.
              </dd>
              <dt>Tokens</dt>
              <dd>
                The root size (what 1rem equals), the spacing and radius scales, shadows with layers and a
                version per theme, and other tokens such as durations.
              </dd>
              <dt>Assets</dt>
              <dd>Logos, icons, favicons and groups of your own, uploaded or picked from the library.</dd>
            </dl>
            <ul>
              <li>
                <strong>Load</strong> opens a brand file (<code>.resolver.json</code> or
                <code>.tokens.json</code>), a brand kit ZIP, font files or assets. You can also drop files
                anywhere on the page.
              </li>
              <li>
                Edits are kept in this browser, separately for each site address, until you load or start
                another brand. Save JSON to keep a copy.
              </li>
              <li>
                <strong>View</strong> shows the brand book without the editor, as readers see it.
                <strong>Back to editing</strong> returns.
              </li>
            </ul>

            <h3>Keyboard</h3>
            <dl class="cd-help-keys">
              <dt><kbd>Ctrl</kbd> or <kbd>Cmd</kbd> + <kbd>Z</kbd></dt>
              <dd>Undo, when the cursor is not in a text field</dd>
              <dt>
                <kbd>Ctrl</kbd> or <kbd>Cmd</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd>, or <kbd>Ctrl</kbd> +
                <kbd>Y</kbd>
              </dt>
              <dd>Redo</dd>
              <dt><kbd>Esc</kbd></dt>
              <dd>Close the editor, this help, or the tour</dd>
              <dt><kbd>←</kbd> <kbd>→</kbd></dt>
              <dd>Previous and next step in the tour</dd>
            </dl>

            <h3>Sharing a brand book</h3>
            <ul>
              <li>
                Add <code>?brand=</code> and a library path to the address to show that brand read-only, for
                example <code>?brand=brands/harbor.resolver.json</code>.
              </li>
              <li>
                To host your own brand, add its file to the library and build the site with
                <code>VITE_PUBLIC_BRAND</code> set to its path. Every visitor then sees that brand, read-only.
              </li>
            </ul>
          </template>
        </div>
      </DialogContent>
    </DialogPortal>
  </DialogRoot>
</template>
