import type { Session } from '../app/session';
import { generateCss } from '../lib/css';
import { resolve } from '../lib/resolver';
import type { BrandMeta, FontFile, Tokens } from '../lib/types';
import { urlFor } from './urls';

export type View = {
  tokens: Tokens;
  meta: BrandMeta;
  css: string;
};

export type ViewSession = Pick<
  Session,
  'doc' | 'preset' | 'vendor' | 'ctx' | 'meta' | 'fallBack'
>;

export function deriveView(session: ViewSession, theme: string): View {
  const build = (): View => {
    const doc = session.doc;
    const fontSrc = (f: FontFile) => urlFor(f, session.ctx) ?? f.src;
    return {
      tokens: resolve(doc, { theme }),
      meta: session.meta,
      css: generateCss(doc, {
        vendor: session.vendor,
        fontSrc,
        elementScope: 'main',
      }),
    };
  };
  try {
    return build();
  } catch (error) {
    if (session.doc === session.preset) throw error;
    session.fallBack(error);
    return build();
  }
}
