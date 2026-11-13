import { HOSTED_URL } from '../config.js';
import {
  adoptVendor,
  allSrcs,
  readBrandMeta,
  brandMeta,
  matchDropped,
  missingAssets,
  withBrandMeta,
} from '../lib/assets.js';
import * as E from '../lib/edit.js';
import {
  buildExport,
  classify,
  errorMessage,
  loadZip,
  parseBrandJson,
  problemText,
  saveJson,
  slug,
} from '../lib/io.js';
import { createStore, type Store } from '../lib/state.js';
import type { AssetContext, BrandMeta, Manifest, Problem, ResolverDoc, SessionFiles } from '../lib/types.js';
import { uniquePath } from '../lib/path.js';
import type { Parsed, FileStore, FontProvider, KeyValueStore, Validator } from '../ports.js';
import { vendorKey } from '../lib/vendor-key.js';

export interface Ambiguous {
  file: File;
  candidates: string[];
}

const stem = (name: string) => name.replace(/\.[^.]+$/, '');
const describe = (file: string, errors: Problem[]) =>
  errors.map((problem) => `${file}: ${problemText(problem)}`);

async function fetchJson(url: string): Promise<unknown> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load ${url} (${res.status})`);
  return res.json();
}

function accepted<T>(source: string, checked: Parsed<T>): T {
  if (checked.ok) return checked.value;
  throw new Error(`${source} is not valid: ${checked.problems.map(problemText).join('; ')}`);
}

async function fetchPreset(path: string, validator: Validator): Promise<ResolverDoc> {
  const source = `library/${path}`;
  return accepted(source, validator.parseBrand(await fetchJson(source)));
}

export interface SessionAdapters {
  drafts: KeyValueStore;
  files: FileStore;
  fonts: FontProvider;
  validator: Validator;
}

export class Session {
  readonly vendor = vendorKey(HOSTED_URL);
  readonly library: Set<string>;
  readonly ctx: AssetContext;
  warnings: string[] = [];
  pending: File[] = [];
  ambiguous: Ambiguous[] = [];
  readonly #listeners = new Set<() => void>();

  private constructor(
    readonly store: Store,
    readonly manifest: Manifest,
    readonly preset: ResolverDoc,
    readonly fonts: FontProvider,
    readonly validator: Validator,
  ) {
    this.library = new Set(manifest.files);
    this.ctx = { session: store.files, library: this.library, fonts };
    store.subscribe(() => this.#changed());
  }

  static async open({ drafts, files, fonts, validator }: SessionAdapters): Promise<Session> {
    const manifest = accepted(
      'library/manifest.json',
      validator.parseManifest(await fetchJson('library/manifest.json')),
    );
    const preset = await fetchPreset(manifest.brands[0].path, validator);
    const store = createStore({ doc: preset, storage: drafts, fileStore: files });
    await store.ready;
    return new Session(store, manifest, preset, fonts, validator);
  }

  loadPreset(path: string): Promise<ResolverDoc> {
    return fetchPreset(path, this.validator);
  }

  subscribe(fn: () => void) {
    this.#listeners.add(fn);
    return () => this.#listeners.delete(fn);
  }

  #changed() {
    for (const fn of this.#listeners) fn();
  }

  get doc() {
    return this.store.get();
  }

  get meta(): BrandMeta {
    return brandMeta(this.doc, this.vendor);
  }

  setMeta(fn: (meta: BrandMeta) => BrandMeta) {
    this.store.set(withBrandMeta(this.doc, this.vendor, fn(this.meta)));
  }

  warn(...messages: string[]) {
    const fresh = messages.filter((m) => !this.warnings.includes(m));
    if (!fresh.length) return;
    this.warnings = [...this.warnings, ...new Set(fresh)];
    this.#changed();
  }

  dismissWarnings() {
    this.warnings = [];
    this.#changed();
  }

  fallBack(error: unknown) {
    this.warnings = [
      ...this.warnings,
      `This brand could not be shown (${error instanceof Error ? error.message : String(error)}). ` +
        'Showing the default brand; your draft is under Edit > Restore previous draft.',
    ];
    this.store.load(this.preset, undefined, { record: false });
  }

  #takenPaths() {
    return new Set([...this.store.files.keys(), ...allSrcs(this.meta).map((s) => s.src)]);
  }

  #place<T>(files: File[], folder: string, entry: (file: File, src: string) => T) {
    const taken = this.#takenPaths();
    const map: SessionFiles = new Map();
    const entries = files.map((file) => {
      const src = uniquePath(`${folder}/${file.name}`, taken);
      taken.add(src);
      map.set(src, file);
      return entry(file, src);
    });
    return { map, entries };
  }

  async #persist(map: SessionFiles) {
    const { notPersisted } = await this.store.addFiles(map);
    if (notPersisted.length) {
      this.warn(
        ...notPersisted.map(
          (p) =>
            `Not saved in this browser (storage full): ${p}. It is still in this session and in exports.`,
        ),
      );
    }
  }

  async addUploads(files: File[], groupId: string) {
    const { map, entries } = this.#place(files, groupId, (file, src) => ({ label: stem(file.name), src }));
    await this.#persist(map);
    this.setMeta((m) => E.addItems(m, groupId, entries));
  }

  async addFontUploads(files: File[]) {
    const { map, entries } = this.#place(files, 'fonts', (file, src) => ({
      ...E.fontFromFileName(file.name),
      src,
    }));
    await this.#persist(map);
    this.setMeta((m) => E.addFontFiles(m, entries));
  }

  async #loadBrand(doc: ResolverDoc, files?: SessionFiles) {
    const own = adoptVendor(doc, this.vendor);
    this.store.load(withBrandMeta(own, this.vendor, brandMeta(own, this.vendor)));
    this.pending = [];
    this.ambiguous = [];
    if (files?.size) await this.#persist(files);
  }

  async fillMissing(files: File[]) {
    const { matched, ambiguous, unmatched } = matchDropped(missingAssets(this.meta, this.ctx), files);
    if (matched.size) await this.#persist(matched);
    this.ambiguous = [
      ...this.ambiguous,
      ...ambiguous.flatMap(({ name, candidates }) => {
        const file = files.find((f) => f.name === name);
        return file ? [{ file, candidates }] : [];
      }),
    ];
    this.pending = [...this.pending, ...unmatched];
    this.#changed();
  }

  async assign(file: File, path: string) {
    this.ambiguous = this.ambiguous.filter((a) => a.file !== file);
    await this.#persist(new Map([[path, file]]));
  }

  async addPending(groupId: string | null) {
    let id = groupId;
    if (!id) {
      const next = E.addGroup(this.meta, 'Uploads');
      this.setMeta(() => next);
      id = next.assetGroups.at(-1)?.id ?? null;
    }
    if (!id) return;
    const files = this.pending;
    this.pending = [];
    await this.addUploads(files, id);
  }

  discardPending() {
    this.pending = [];
    this.#changed();
  }

  async receive(files: File[]) {
    try {
      const brands = files.filter((f) => ['resolver', 'tokens', 'zip'].includes(classify(f.name)));
      const [brand] = brands;
      if (brands.length > 1)
        this.warn(`Loaded ${brand.name}; drop one brand file at a time (${brands.length - 1} ignored).`);
      if (brand) await this.#receiveBrand(brand);
      const rest = files.filter((f) => !brands.includes(f));
      const fonts = rest.filter((f) => classify(f.name) === 'font');
      if (fonts.length) await this.addFontUploads(fonts);
      const others = rest.filter((f) => !fonts.includes(f));
      if (others.length) await this.fillMissing(others);
    } catch (e) {
      this.warn(`Could not load ${files.map((f) => f.name).join(', ')}: ${errorMessage(e)}`);
    }
  }

  async #receiveBrand(file: File) {
    const { doc, errors, files } =
      classify(file.name) === 'zip'
        ? loadZip(new Uint8Array(await file.arrayBuffer()), this.validator)
        : { ...parseBrandJson(await file.text(), file.name, this.validator), files: undefined };
    if (doc && !errors.length) await this.#loadBrand(doc, files);
    else this.warn(...describe(file.name, errors));
  }

  get fileName() {
    return slug(this.doc.name ?? 'brand');
  }

  brandJson() {
    return { name: `${this.fileName}.resolver.json`, data: saveJson(this.doc) };
  }

  async brandKit() {
    const fetchBytes = async (url: string) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${res.status}`);
      return new Uint8Array(await res.arrayBuffer());
    };
    const { zip, warnings } = await buildExport(this.doc, {
      vendor: this.vendor,
      files: this.store.files,
      library: this.library,
      fonts: this.fonts,
      fetchBytes,
      hostedUrl: HOSTED_URL,
    });
    if (warnings.length) this.warn(...warnings.map((x) => `Export: ${x}`));
    return { name: `${this.fileName}-brand-kit.zip`, data: zip };
  }

  prune() {
    const used = new Set<string>();
    for (const draft of this.store.drafts()) {
      const own = draft.sets.foundation?.$extensions?.[this.vendor] ?? {};
      if (this.validator.checkBrandMeta(own, 'brand').length) return;
      for (const { src } of allSrcs(readBrandMeta(own))) used.add(src);
    }
    return this.store.prune(used);
  }
}
