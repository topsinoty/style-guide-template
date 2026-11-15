<script setup lang="ts">
import { computed } from 'vue';
import type { Session } from '~/app';
import {
  cssName,
  cssString,
  cssValue,
  defaultTheme,
  extension,
  fileName,
  isColor,
  mainLogo,
  narrow,
  toHex,
} from '~/lib';
import type { AssetItem } from '~/lib';
import { urlFor } from '../urls';
import { deriveView } from '../view';
import { colorData } from './colors';
import { dim, isImage, radiusText, shadowText } from './parts';
import Prose from './Prose.vue';
import { isOtherToken, visibleSections } from './sections';
import { fontFamilies, fontSizes, textStyles } from './typography';

const props = defineProps<{ session: Session }>();
const SCALES = new Set(['spacing', 'radius', 'shadow']);

const view = computed(() =>
  deriveView(props.session, defaultTheme(props.session.doc) ?? 'light'),
);
const tokens = computed(() => view.value.tokens);
const meta = computed(() => view.value.meta);
const chapters = computed(() =>
  visibleSections(meta.value, tokens.value, false).filter(
    (s) => s.id !== 'css-variables',
  ),
);
const logo = computed(() => mainLogo(meta.value));
const color = computed(() => colorData(tokens.value, props.session.vendor));
const otherTokens = computed(() =>
  [...tokens.value].filter(([path]) => isOtherToken(path)),
);
const steps = (kind: string) =>
  [...tokens.value].filter(([path]) => path.startsWith(`${kind}.`));
const itemsOf = (id: string) =>
  meta.value.assetGroups.find((g) => g.id === id)?.items ?? [];
const url = (item: AssetItem) => urlFor(item, props.session.ctx);
const css = (type: string, value: unknown) => cssValue(type, value) ?? '';
const number = (i: number) => String(i + 1).padStart(2, '0');

function hexOf(path: string) {
  const resolved = narrow(tokens.value.get(path)?.resolved, isColor);

  return resolved ? toHex(resolved) : undefined;
}

function paint(value: string | undefined) {
  const ref = value && /^\{(.+)\}$/.exec(value);

  return ref ? hexOf(ref[1]) : value;
}

const surface = (value: string | undefined) =>
  paint(value) ?? hexOf('color.page.background');
</script>

<template>
  <div class="cd-print">
    <section class="pb-cover">
      <img
        v-if="logo && url(logo)"
        class="pb-cover-logo"
        :src="url(logo) ?? undefined"
        :alt="session.doc.name ?? 'Logo'"
        :style="{
          background:
            paint(logo.background) ?? hexOf('color.primary.background'),
        }"
      />
      <h1 class="pb-title">{{ session.doc.name ?? 'Style Guide' }}</h1>
      <Prose
        v-if="session.doc.description"
        class="pb-lead"
        :text="session.doc.description"
      />
    </section>
    <section
      v-for="(chapter, i) in chapters"
      :key="chapter.id"
      class="pb-chapter"
      :class="{ 'is-scale': SCALES.has(chapter.id) }"
    >
      <h2 class="pb-heading">
        <span class="pb-number">{{ number(i) }}</span> {{ chapter.title }}
      </h2>
      <Prose v-if="chapter.body" class="pb-body" :text="chapter.body" />
      <template v-if="chapter.id === 'branding'">
        <div class="pb-grid pb-logos">
          <figure v-for="item in itemsOf('logos')" :key="item.src">
            <img
              v-if="url(item)"
              :src="url(item) ?? undefined"
              :alt="item.label ?? fileName(item.src)"
              :style="{ background: surface(item.background) }"
            />
            <figcaption>{{ item.label ?? fileName(item.src) }}</figcaption>
          </figure>
        </div>
        <div v-if="itemsOf('favicons').length" class="pb-grid pb-icons">
          <figure v-for="item in itemsOf('favicons')" :key="item.src">
            <img
              v-if="url(item)"
              :src="url(item) ?? undefined"
              :alt="item.label ?? fileName(item.src)"
            />
            <figcaption>{{ item.label ?? fileName(item.src) }}</figcaption>
          </figure>
        </div>
      </template>
      <template v-else-if="chapter.id === 'colors'">
        <div v-for="[hue, shades] in color.hues" :key="hue" class="pb-block">
          <h3 class="pb-subheading">{{ hue }}</h3>
          <div class="pb-grid pb-swatches">
            <figure v-for="s in shades" :key="s.path">
              <div class="pb-swatch" :style="{ background: s.hex }"></div>
              <figcaption>
                <b>{{ s.name }}</b>
                <span v-for="copy in s.copies" :key="copy.shown">{{
                  copy.shown
                }}</span>
              </figcaption>
            </figure>
          </div>
        </div>
        <div v-for="table in color.tables" :key="table.title" class="pb-block">
          <h3 class="pb-subheading">{{ table.title }}</h3>
          <table class="pb-table">
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
                  <span class="pb-chip" :style="{ background: r.hex }"></span
                  ><code>{{ cssName(r.path) }}</code>
                </td>
                <td>
                  <code>{{ r.source }}</code>
                </td>
                <td>
                  <code>{{ r.hex }}</code>
                </td>
                <td>{{ r.description }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
      <template v-else-if="chapter.id === 'typography'">
        <div
          v-for="[family, files] in fontFamilies(meta)"
          :key="family"
          class="pb-block"
        >
          <h3 class="pb-subheading">{{ family }}</h3>
          <p
            v-for="file in files"
            :key="file.src"
            class="pb-specimen"
            :style="{
              fontFamily: cssString(family),
              fontWeight: String(file.weight),
              fontStyle: file.style,
            }"
          >
            The quick brown fox jumps over the lazy dog
            <small>{{ file.weight }} {{ file.style }}</small>
          </p>
        </div>
        <div v-if="textStyles(tokens).length" class="pb-block">
          <h3 class="pb-subheading">Text styles</h3>
          <div
            v-for="{ path, name, style, summary, description } in textStyles(
              tokens,
            )"
            :key="path"
            class="pb-row"
          >
            <span
              class="pb-sample"
              :style="{
                fontFamily: css('fontFamily', style.fontFamily),
                fontSize: css('dimension', style.fontSize),
                fontWeight: css('fontWeight', style.fontWeight),
                letterSpacing: css('dimension', style.letterSpacing),
                lineHeight: css('number', style.lineHeight),
              }"
              >{{ name }}</span
            >
            <small
              >{{ summary }}<br v-if="description" />{{ description }}</small
            >
          </div>
        </div>
        <div v-if="fontSizes(tokens).length" class="pb-block">
          <h3 class="pb-subheading">Font sizes</h3>
          <div
            v-for="[path, token] in fontSizes(tokens)"
            :key="path"
            class="pb-row"
          >
            <span
              class="pb-sample"
              :style="{ fontSize: css('dimension', token.resolved) }"
              >Aa</span
            >
            <small
              ><code>{{ cssName(path) }}</code> {{ dim(token.resolved) }}</small
            >
          </div>
        </div>
      </template>
      <div v-else-if="chapter.id === 'icons'" class="pb-grid pb-icons">
        <figure v-for="item in itemsOf('icons')" :key="item.src">
          <img v-if="url(item)" :src="url(item) ?? undefined" alt="" />
          <figcaption>{{ item.label ?? fileName(item.src) }}</figcaption>
        </figure>
      </div>
      <table v-else-if="chapter.id === 'spacing'" class="pb-table">
        <tbody>
          <tr v-for="[path, token] in steps('spacing')" :key="path">
            <td>
              <code>{{ cssName(path) }}</code>
            </td>
            <td>{{ dim(token.resolved) }}</td>
            <td class="pb-wide">
              <span
                class="pb-bar"
                :style="{ width: css('dimension', token.resolved) }"
              ></span>
            </td>
          </tr>
        </tbody>
      </table>
      <div
        v-else-if="chapter.id === 'radius' || chapter.id === 'shadow'"
        class="pb-grid pb-shapes"
      >
        <figure v-for="[path, token] in steps(chapter.id)" :key="path">
          <div
            class="pb-shape"
            :style="
              chapter.id === 'radius'
                ? { borderRadius: css('dimension', token.resolved) }
                : { boxShadow: css('shadow', token.resolved) }
            "
          ></div>
          <figcaption>
            <code>{{ cssName(path) }}</code>
            <span>{{
              chapter.id === 'radius'
                ? radiusText(token.resolved)
                : shadowText(token.resolved)
            }}</span>
          </figcaption>
        </figure>
      </div>
      <table v-else-if="chapter.id === 'other-tokens'" class="pb-table">
        <thead>
          <tr>
            <th>Token</th>
            <th>Type</th>
            <th>Value</th>
            <th>Usage</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="[path, token] in otherTokens" :key="path">
            <td>
              <code>{{ cssName(path) }}</code>
            </td>
            <td>{{ token.type }}</td>
            <td>
              <code>{{ css(token.type ?? '', token.resolved) }}</code>
            </td>
            <td>{{ token.description }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else-if="chapter.group" class="pb-grid pb-files">
        <figure v-for="item in itemsOf(chapter.group)" :key="item.src">
          <img
            v-if="url(item) && isImage(extension(item.src))"
            :src="url(item) ?? undefined"
            :alt="item.label ?? fileName(item.src)"
            :style="{ background: surface(item.background) }"
          />
          <div v-else class="pb-file">
            {{ extension(item.src).toUpperCase() }}
          </div>
          <figcaption>
            <b>{{ item.label ?? fileName(item.src) }}</b>
            <span>{{ fileName(item.src) }}</span>
            <span v-if="item.description">{{ item.description }}</span>
          </figcaption>
        </figure>
      </div>
    </section>
  </div>
</template>
