Style Guide Template
====================

A brand book that is its own editor. A brand is one [W3C Design Tokens](https://www.designtokens.org/tr/2025.10/) resolver file; the page is styled by it, and the editor changes it in the browser. Open Help on the page for a tour and a guide to every part.

## Run it

```
pnpm install
pnpm dev        # http://localhost:8000
pnpm build      # static site in dist/
```

Set the site's address in `src/config.ts` (`HOSTED_URL`). Exported kits link to it, and the brand file's `$extensions` key comes from it.

## Sharing a brand

- `?view` shows your draft without the editor.
- `?brand=brands/harbor.resolver.json` shows a library brand, read-only.
- `VITE_PUBLIC_BRAND=brands/<file>.resolver.json pnpm build` makes a site that shows only that brand, read-only.

## The brand file

One DTCG 2025.10 resolver document:

- `color.<hue>.<50..950>`: the palette
- `color.<role>.<background|foreground|border>[-hover|-active]`: the roles `primary`, `secondary`, `destructive`, `success`, `warning`, `info`, `page`, `card`, `muted`, `input`, `focus`
- `spacing`, `radius`, `font-size`: scales, with their generator in the group's `$extensions`
- `font`, `typography`, `shadow`, `duration`
- a `theme` modifier with one context per theme
- `$description` on a token: its usage note
- the `foundation` set's `$extensions`: asset groups, font files, `sections`, `contrast` pairs and `rootSize`

A token becomes a CSS variable named by its path: `color.primary.background` is `--color-primary-background`. Other themes apply under `:root[data-theme="<theme>"]`.

## The library

`public/library/` holds the files and brands offered to every user. List each file in `public/library/manifest.json` under `files`, and each brand under `brands` as `{ "name", "path" }`; the first brand is the one new visitors see. `pnpm test` checks that every brand is valid, passes contrast in every theme and finds all its files.

## Contributing

`pnpm lint`, `pnpm typecheck` and `pnpm test` must pass; CI runs them and the build on every pull request.

## License

MIT. Based on the [CodyHouse Style Guide Template](http://codyhouse.co/gem/css-style-guide-template/) ([terms](http://codyhouse.co/terms/)). Library icons by [Petras Nargela](https://dribbble.com/petrasnargela). Third-party licenses are written to `dist/.vite/license.md` on build.
