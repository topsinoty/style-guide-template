Style Guide Template
====================

A brand book that is also its own editor. A brand is one [W3C Design Tokens](https://www.designtokens.org/tr/2025.10/) (DTCG 2025.10) resolver file: load it and the whole page is styled by its colors, fonts, scales and assets, in every theme it has. Edit it in the browser, save the JSON, or export a brand kit ZIP. Everything runs in the browser.

## Run it

```
pnpm install
pnpm dev             # http://localhost:8000, reloads on save
```

- `pnpm build`: typecheck, then the site in `dist/`, ready to host as static files
- `pnpm preview`: serve `dist/` on http://localhost:8000
- `pnpm test`: unit tests (Vitest)
- `pnpm typecheck`: TypeScript, strict
- `pnpm lint`: ESLint and Prettier

The dev and preview servers use port 8000: the browser keeps drafts and uploaded files per address.

Set the site's address in `src/config.ts` (`HOSTED_URL`). The README in every exported kit links there, and the brand file's `$extensions` key is derived from it (`https://styleguide.example.com` becomes `com.example.styleguide`).

## Modes

- **Editing** (the plain address): the brand book with the editor. Edits are kept in this browser (localStorage and IndexedDB) until you load or start another brand.
- **View** (`?view`): your draft as readers see it, without the editor. Nothing in this view changes the draft.
- **Shared brand** (`?brand=brands/harbor.resolver.json`): any brand listed in the library, read-only.
- **Hosted brand book**: build with `VITE_PUBLIC_BRAND=brands/<file>.resolver.json pnpm build` and every visitor sees that brand, read-only. The brand must be listed in the library (see below).

Read-only pages keep the theme switch, the text inspector, the contrast badge, Save JSON, Export ZIP, Help and the tour.

## Using the site

- **Tour:** the first visit starts a short tour of the page and the editor. Skip it, step back and forth with the buttons or the arrow keys, and start it again from Help.
- **Help** explains every part of the page, the keyboard shortcuts and how to share a brand.
- **Inspect:** hover over any text, or select it, to see its HTML element, the text style applied to it, and its font, size and line height.
- **Load:** drop a `.resolver.json`, a `.tokens.json` or a brand kit ZIP anywhere on the page, or use Load. Fonts and other files can be dropped too.
- **Presets:** Default, Harbor, Circuit, Meadow and Mono. Brand › Start again replaces the brand with a preset, or clears it to black and white.
- **Save JSON** downloads the brand file. **Export ZIP** downloads the kit: the brand file, `css/theme.css`, fonts with their licenses, one folder per asset group, and a README.
- Undo and Redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z or Ctrl+Y) step through every edit.
- The contrast badge checks every role's text against its background, input and focus borders against the page, and any pairs the brand declares, in every theme. Failures are warnings.

## The editor

The tabs follow the order a brand is built in:

- **Brand:** name and introduction; the guide's sections, with text of their own (`**bold**`, `*italic*`, `` `code` ``, `[links](https://…)`, `- ` lists and `## ` headings) and text-only sections, in any order; a usage note on any token; Start again.
- **Color:** the palette (a new color gets 11 OKLCH shades from 50 to 950, each with CMYK and an optional Pantone name); roles, filled part by part or all from one shade; extra contrast pairs; themes with any names. Color edits apply to the theme chosen under "Editing colors for".
- **Type:** font files from [Fontsource](https://fontsource.org) or your own uploads; font families; the font-size scale, in px or rem, with an optional ratio; text styles, each of which can apply to an element such as Heading 1 or Paragraph.
- **Tokens:** the root size (what 1rem equals); spacing and radius scales; shadows with stacked layers and a version per theme; other tokens such as durations and easing.
- **Assets:** logos, icons, favicons and groups of your own, uploaded or picked from the library.

Every empty scale or shadow list offers a standard set, so a brand can be rebuilt from blank one step at a time.

## The brand file

One DTCG 2025.10 resolver document with the tokens inline:

- `color.<hue>.<50..950>`: the palette; `color.<role>.<background|foreground|border>[-hover|-active]`: the roles (`primary`, `secondary`, `destructive`, `success`, `warning`, `info`, `page`, `card`, `muted`, `input`, `focus`)
- `spacing`, `radius`, `font-size`: generated scales; the generator lives in the group's `$extensions`
- `font`, `typography`, `shadow`, `duration`; a text style's `$extensions` can name the element it applies to
- a `theme` modifier with one context per theme
- a token's `$description` is its usage note
- in the `foundation` set's `$extensions`: logos, icons, other asset groups and font files; `sections` (`{ id, title, body }`, in page order; text-only sections have ids starting `text-`); `contrast` (`{ fg, bg, min }` token paths); `rootSize` (pixels per rem)

CSS custom properties are the token path joined with `-`: `color.primary.background` becomes `--color-primary-background`. Each other theme's values apply under `:root[data-theme="<theme>"]`.

## The library

Files under `public/library/` are offered to every user of the site (served at `library/`). To add some:

1. Put the files under `public/library/` (for example `public/library/logos/acme.svg`).
2. List each path, relative to `public/library/`, in `public/library/manifest.json` under `files`.
3. To add a brand, put its resolver file in `public/library/brands/` and add `{ "name": ..., "path": "brands/..." }` under `brands`. The first brand is the one a new visitor sees.

`pnpm test` checks that the manifest matches the files on disk and that every brand is valid, resolves in every theme, has every role, passes contrast, and finds all its assets.

## Contributing

Run `pnpm lint`, `pnpm typecheck` and `pnpm test` before opening a pull request; CI runs them with the build on every push and pull request.

## License

MIT, see [LICENSE](LICENSE).

Based on the [CodyHouse Style Guide Template](http://codyhouse.co/gem/css-style-guide-template/) ([Terms](http://codyhouse.co/terms/)).

Color conversion and parsing by [culori](https://culorijs.org) (MIT). ZIP files by [fflate](https://github.com/101arrowz/fflate) (MIT). Stored files by [idb-keyval](https://github.com/jakearchibald/idb-keyval) (Apache-2.0). Components by [Vue](https://vuejs.org) (MIT), [VueUse](https://vueuse.org) (MIT) and [Reka UI](https://reka-ui.com) (MIT). Icons by [Lucide](https://lucide.dev) (ISC). Validation by [zod](https://zod.dev) (MIT). The build writes every bundled library's license to `dist/.vite/license.md`.

Library icons by [Petras Nargela](https://dribbble.com/petrasnargela), available for free download on [Freebiesbug](http://freebiesbug.com/psd-freebies/80-stroke-icons-psd-ai-webfont/).
