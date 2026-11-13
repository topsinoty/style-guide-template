import type { FontProvider } from '../ports.js';

export type VendorData = Record<string, unknown>;

export interface TokenNode {
  $value?: unknown;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, VendorData>;
  [key: string]: unknown;
}

export type ColorSpace =
  | 'srgb'
  | 'srgb-linear'
  | 'hsl'
  | 'hwb'
  | 'lab'
  | 'lch'
  | 'oklab'
  | 'oklch'
  | 'display-p3'
  | 'a98-rgb'
  | 'prophoto-rgb'
  | 'rec2020'
  | 'xyz-d65'
  | 'xyz-d50';

export type ColorComponent = number | 'none';

export interface DtcgColor {
  colorSpace: ColorSpace;
  components: [ColorComponent, ColorComponent, ColorComponent];
  alpha?: number;
  hex?: string;
}

export interface TokenSet {
  sources: TokenNode[];
  $extensions?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface Modifier {
  contexts: Record<string, TokenNode[]>;
  default?: string;
}

export interface ResolverDoc {
  $schema?: string;
  version: '2025.10';
  name?: string;
  description?: string;
  sets: Record<string, TokenSet>;
  modifiers?: Record<string, Modifier>;
  resolutionOrder: { $ref: string }[];
}

export type FontStyle = 'normal' | 'italic' | 'oblique';

export interface AssetItem {
  src: string;
  label?: string;
  description?: string;
  provider?: string;
}

export interface AssetGroup {
  id: string;
  label?: string;
  items: AssetItem[];
}

export interface FontFile extends AssetItem {
  family: string;
  weight: number;
  style: FontStyle;
  subset?: string;
  unicodeRange?: string;
  fontsourceId?: string;
  version?: string;
}

export interface BrandMeta {
  assetGroups: AssetGroup[];
  fontFiles: FontFile[];
}

export interface Manifest {
  files: string[];
  brands: { name: string; path: string }[];
}

export interface FontListing {
  id: string;
  family: string;
  category: string;
  weights: number[];
  styles: string[];
  defSubset: string;
  license: string;
}

export interface FontVariant {
  url?: { woff2?: string };
}

export interface FontDetail extends FontListing {
  subsets: string[];
  npmVersion: string;
  unicodeRange?: Record<string, string>;
  variants?: Record<string, Record<string, Record<string, FontVariant>>>;
}

export interface Dimension {
  value: number;
  unit: string;
}

export interface FlatToken {
  type?: string;
  value: unknown;
  extensions?: Record<string, unknown>;
  description?: string;
}

export interface ResolvedToken extends FlatToken {
  resolved: unknown;
}

export type Tokens = Map<string, ResolvedToken>;

export type FileData = Blob | Uint8Array;
export type SessionFiles = Map<string, FileData>;

export interface AssetContext {
  session: SessionFiles;
  library: Set<string>;
  fonts: FontProvider;
}

export interface Problem {
  path?: string;
  message: string;
}

export interface ContrastResult {
  context: string;
  fg: string;
  bg: string;
  min: number;
  label: string;
  ratio: number;
  pass: boolean;
}
