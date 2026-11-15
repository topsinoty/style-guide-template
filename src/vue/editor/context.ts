import type { Session } from '../../app/session';
import { withBrandMeta } from '../../lib/assets';
import * as E from '../../lib/edit';
import { checkBrand, problemText } from '../../lib/io';
import { isNode, nodeAt } from '../../lib/tree';
import { isDark } from '../../lib/color';
import { narrow, isColor } from '../../lib/values';
import type {
  BrandMeta,
  ResolverDoc,
  TokenNode,
  Tokens,
} from '../../lib/types';

export type EditorContext = {
  session: Session;
  vendor: string;
  doc: ResolverDoc;
  tree: TokenNode;
  tokens: Tokens;
  meta: BrandMeta;
  theme: string;
  darkPage: boolean;
  setTheme(theme: string): void;
  edit(fn: (doc: ResolverDoc) => ResolverDoc, typingKey?: string): void;
  setToken(path: string, token: TokenNode): void;
  patchValue(path: string, patch: Record<string, unknown>): void;
  setMeta(fn: (meta: BrandMeta) => BrandMeta, typingKey?: string): void;
  fresh(path: string): TokenNode;
};

export function editorContext(
  session: Session,
  theme: string,
  tokens: Tokens,
  setTheme: (theme: string) => void,
): EditorContext {
  const { store, vendor } = session;

  const edit = (fn: (doc: ResolverDoc) => ResolverDoc, typingKey?: string) => {
    const next = fn(store.get());
    const problem = checkBrand(next, session.validator).at(0);
    if (problem) session.warn(`Not applied: ${problemText(problem)}`);
    else store.set(next, typingKey);
  };
  const fresh = (path: string): TokenNode =>
    nodeAt(E.foundation(store.get()), path) ?? {};
  const setToken = (path: string, token: TokenNode) =>
    edit((doc) => E.setToken(doc, path, token));

  return {
    session,
    vendor,
    doc: store.get(),
    tree: E.foundation(store.get()),
    tokens,
    meta: session.meta,
    theme,
    darkPage: isDark(
      narrow(tokens.get('color.page.background')?.resolved, isColor),
    ),
    setTheme,
    edit,
    setToken,
    patchValue(path, patch) {
      const token = fresh(path);
      const value = isNode(token.$value) ? token.$value : {};
      setToken(path, { ...token, $value: { ...value, ...patch } });
    },
    setMeta: (fn, typingKey) =>
      edit((doc) => withBrandMeta(doc, vendor, fn(session.meta)), typingKey),
    fresh,
  };
}
