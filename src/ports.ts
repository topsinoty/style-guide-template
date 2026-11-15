import type {
  FileData,
  FontDetail,
  FontFile,
  FontListing,
  Manifest,
  Problem,
  ResolverDoc,
} from '~/lib';

export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export type FileStore = {
  put(path: string, data: FileData): Promise<unknown>;
  delete(path: string): Promise<unknown>;
  clear(): Promise<unknown>;
  getAll(): Promise<Map<string, FileData>>;
};

export type FontPicks = {
  weights: number[];
  styles: string[];
  subsets: string[];
};

export type FontProvider = {
  readonly id: string;
  readonly name: string;
  list(): Promise<FontListing[]>;
  font(id: string): Promise<FontDetail>;
  files(font: FontDetail, picks: FontPicks): FontFile[];
  fileUrl(file: FontFile): string;
  licenseUrl(file: FontFile): string;
  previewUrl(font: FontListing): string;
};

export type ExportFormat = {
  readonly key: string;
  readonly label: string;
  render(doc: ResolverDoc, vendor: string): string;
};

export type Parsed<T> =
  { ok: true; value: T } | { ok: false; problems: Problem[] };

export type Validator = {
  parseBrand(input: unknown): Parsed<ResolverDoc>;
  parseManifest(input: unknown): Parsed<Manifest>;
  checkBrandMeta(input: unknown, path: string): Problem[];
};
