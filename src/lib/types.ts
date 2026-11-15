import type { FontProvider } from '../ports.js';

export type VendorData = Record<string, unknown>;

export type TokenNode = {
  $value?: unknown;
  $type?: string;
  $description?: string;
  $extensions?: Record<string, VendorData>;
  [key: string]: unknown;
};

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

export type DtcgColor = {
  colorSpace: ColorSpace;
  components: [ColorComponent, ColorComponent, ColorComponent];
  alpha?: number;
  hex?: string;
};

export type TokenSet = {
  sources: TokenNode[];
  $extensions?: Record<string, unknown>;
  [key: string]: unknown;
};

export type Modifier = {
  contexts: Record<string, TokenNode[]>;
  default?: string;
};

export type ResolverDoc = {
  $schema?: string;
  version: '2025.10';
  name?: string;
  description?: string;
  sets: Record<string, TokenSet>;
  modifiers?: Record<string, Modifier>;
  resolutionOrder: { $ref: string }[];
};

export type FontStyle = 'normal' | 'italic' | 'oblique';

export type AssetItem = {
  src: string;
  label?: string;
  description?: string;
  provider?: string;
  background?: string;
  wide?: boolean;
  [key: string]: unknown;
};

export type AssetGroup = {
  id: string;
  label?: string;
  items: AssetItem[];
  [key: string]: unknown;
};

export type FontFile = {
  family: string;
  weight: number;
  style: FontStyle;
  subset?: string;
  unicodeRange?: string;
  fontsourceId?: string;
  version?: string;
} & AssetItem;

export type TextSection = {
  id: string;
  title?: string;
  body?: string;
};

export type ContrastPair = {
  fg: string;
  bg: string;
  min: number;
};

export type BrandMeta = {
  assetGroups: AssetGroup[];
  fontFiles: FontFile[];
  logo?: string;
  sections?: TextSection[];
  contrast?: ContrastPair[];
  rootSize?: number;
  [key: string]: unknown;
};

export type Manifest = {
  files: string[];
  brands: { name: string; path: string }[];
};

export type FontListing = {
  id: string;
  family: string;
  category: string;
  weights: number[];
  styles: string[];
  defSubset: string;
  license: string;
};

type Sparse<T> = Record<string, T | undefined>;

export type FontVariant = {
  url?: { woff2?: string };
};

export type FontDetail = {
  subsets: string[];
  npmVersion: string;
  unicodeRange?: Record<string, string>;
  variants?: Sparse<Sparse<Sparse<FontVariant>>>;
} & FontListing;

export type Dimension = {
  value: number;
  unit: string;
};

export type Alias = string | { $ref: string };
export type OrAlias<T> = T | Alias;

export type CubicBezier = [number, number, number, number];
export type FontFamily = string | string[];
export type FontWeight = number | string;
export type StrokeStyle = string | Record<string, unknown>;

export type ShadowLayer = {
  color: OrAlias<DtcgColor>;
  offsetX: OrAlias<Dimension>;
  offsetY: OrAlias<Dimension>;
  blur: OrAlias<Dimension>;
  spread: OrAlias<Dimension>;
  inset?: boolean;
};

export type Shadow = ShadowLayer | OrAlias<ShadowLayer>[];

export type Border = {
  color: OrAlias<DtcgColor>;
  width: OrAlias<Dimension>;
  style: OrAlias<StrokeStyle>;
};

export type Transition = {
  duration: OrAlias<Dimension>;
  delay: OrAlias<Dimension>;
  timingFunction: OrAlias<CubicBezier>;
};

export type Typography = {
  fontFamily: OrAlias<FontFamily>;
  fontSize: OrAlias<Dimension>;
  fontWeight: OrAlias<FontWeight>;
  letterSpacing: OrAlias<Dimension>;
  lineHeight: OrAlias<number>;
};

export type FlatToken = {
  type?: string;
  value: unknown;
  extensions?: Record<string, unknown>;
  description?: string;
};

export type ResolvedToken = {
  resolved: unknown;
} & FlatToken;

export type Tokens = Map<string, ResolvedToken>;

export type FileData = Blob | Uint8Array;
export type SessionFiles = Map<string, FileData>;

export type AssetContext = {
  session: SessionFiles;
  library: Set<string>;
  fonts: FontProvider;
};

export type Problem = {
  path?: string;
  message: string;
};

export type ContrastResult = {
  context: string;
  fg: string;
  bg: string;
  min: number;
  label: string;
  ratio: number;
  pass: boolean;
};
