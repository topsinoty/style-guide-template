Style Guide Template
=========

A hosted style guide that is also its own editor and a live preview of a brand. A brand is one [W3C Design Tokens](https://www.designtokens.org/tr/2025.10/) (DTCG 2025.10) resolver file: load it and the whole page is styled by its colors, fonts, scales and assets, in light and dark. Edit it in the browser, save the JSON, or export a brand kit ZIP.

Everything runs in the browser. There is no backend.

## Run it

```
pnpm install
pnpm dev             # http://localhost:8000, reloads on save
```

- `pnpm build`: typecheck, then the site in `dist/`, ready to host as static files
- `pnpm preview`: serve `dist/` on http://localhost:8000
- `pnpm test`: unit tests (Vitest)
- `pnpm typecheck`: TypeScript, strict for `src/`

The dev and preview servers always use port 8000: the browser keeps drafts and uploaded files per address.

Set the site's address in `src/config.ts` (`HOSTED_URL`). The README in every exported kit links there, and the brand file's `$extensions` key is derived from it (`https://styleguide.example.com` becomes `com.example.styleguide`).

## Using the site

- **Load:** drop a `.resolver.json`, a `.tokens.json` or a brand kit ZIP anywhere on the page, or use Load. Fonts and other files can be dropped too.
- **Edit:** palette (11 OKLCH shades per hue, with CMYK and Pantone), roles per theme, fonts and text styles, spacing / radius / font-size scales, shadows, and asset groups.
- **Write the brand book:** an introduction under the brand name, text for every section (voice, logo rules, imagery, how to use each color), and text-only sections of your own, in any order. Text fields take `**bold**`, `*italic*`, `` `code` ``, `[links](https://…)`, `- ` lists and `## ` headings.
- **Usage notes:** a note on any token says what it is for; the guide shows it next to the token.
- **Themes:** any number, with any names (light and dark, or poster and web). The header switches between them; the default theme holds every value and the others hold what differs.
- **Fonts:** pick from [Fontsource](https://fontsource.org) (no API key), upload font files, or use the library.
- **Save JSON** downloads the brand file. **Export ZIP** downloads the kit: the brand file, `css/theme.css`, fonts with their licenses, and one folder per asset group.
- Undo and Redo (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z) step back and forward through every edit.
- Edits are kept in the browser (localStorage and IndexedDB) until you clear the draft.
- The Contrast panel checks every role's text against its background, input and focus borders against the page, and any pairs the brand declares (such as ink on ground), in every theme. Failures are warnings.

## The brand file

One DTCG 2025.10 resolver document with the tokens inline:

- `color.<hue>.<50..950>`: the palette; `color.<role>.<background|foreground|border>[-hover|-active]`: the roles (`primary`, `secondary`, `destructive`, `success`, `warning`, `info`, `page`, `card`, `muted`, `input`, `focus`)
- `spacing`, `radius`, `font-size`: generated scales; the generator lives in the group's `$extensions`
- `font`, `typography`, `shadow`, `duration`
- a `theme` modifier with one context per theme
- a token's `$description` is its usage note
- in the `foundation` set's `$extensions`: logos, icons, other asset groups and font files; `sections` (`{ id, title, body }`, in page order; text-only sections have ids starting `text-`); `contrast` (`{ fg, bg, min }` token paths)

CSS custom properties are the token path joined with `-`: `color.primary.background` becomes `--color-primary-background`. Each other theme's values apply under `:root[data-theme="<theme>"]`.

## For maintainers: the library

Files under `public/library/` are offered to every user of the site (served at `library/`). To add some:

1. Put the files under `public/library/` (for example `public/library/logos/acme.svg`).
2. List each path, relative to `public/library/`, in `public/library/manifest.json` under `files`.
3. To add a brand preset, put its resolver file in `public/library/brands/` and add `{ "name": ..., "path": "brands/..." }` under `brands`. The first brand is the one a new visitor sees.

`pnpm test` checks that the manifest matches the files on disk and that every preset is valid, resolves, and passes contrast.

## Credits

Based on the [CodyHouse Style Guide Template](http://codyhouse.co/gem/css-style-guide-template/) ([Terms](http://codyhouse.co/terms/)).

Color conversion and parsing by [culori](https://culorijs.org) (MIT). ZIP files by [fflate](https://github.com/101arrowz/fflate) (MIT). Stored files by [idb-keyval](https://github.com/jakearchibald/idb-keyval) (Apache-2.0). Dropdown placement by [Floating UI](https://floating-ui.com) (MIT). Components by [Vue](https://vuejs.org) (MIT). Icons by [Lucide](https://lucide.dev) (ISC). Validation by [zod](https://zod.dev) (MIT). The build writes every bundled library's license to `dist/.vite/license.md`.

Icons by [Petras Nargela](https://dribbble.com/petrasnargela), available for free download on [Freebiesbug](http://freebiesbug.com/psd-freebies/80-stroke-icons-psd-ai-webfont/). Interface icons from [Lucide](https://lucide.dev).
