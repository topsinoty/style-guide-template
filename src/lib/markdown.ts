export type Inline =
  | { kind: 'text' | 'strong' | 'em' | 'code'; text: string }
  | { kind: 'link'; text: string; href: string };
export type Block =
  | { kind: 'heading' | 'paragraph'; inline: Inline[] }
  | { kind: 'list'; items: Inline[][] };

const INLINE =
  /`([^`]{1,300})`|\*\*([^*]{1,300})\*\*|\*([^*]{1,300})\*|\[([^\]]{1,300})\]\(([^)\s]{1,2000})\)/g;
const SAFE_HREF = /^(https?:|mailto:|#)/i;

function part(match: RegExpMatchArray): Inline {
  const [whole, code, strong, em, label, href] = match;
  if (code) return { kind: 'code', text: code };
  if (strong) return { kind: 'strong', text: strong };
  if (em) return { kind: 'em', text: em };
  return SAFE_HREF.test(href)
    ? { kind: 'link', text: label, href }
    : { kind: 'text', text: whole };
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    if (match.index > last)
      out.push({ kind: 'text', text: text.slice(last, match.index) });
    out.push(part(match));
    last = match.index + match[0].length;
  }
  if (last < text.length) out.push({ kind: 'text', text: text.slice(last) });
  return out;
}

export function parseBlocks(text: string): Block[] {
  const blocks: Block[] = [];
  let paragraph: string[] = [];
  let list: Inline[][] = [];
  const flush = () => {
    if (paragraph.length)
      blocks.push({
        kind: 'paragraph',
        inline: parseInline(paragraph.join(' ')),
      });
    if (list.length) blocks.push({ kind: 'list', items: list });
    paragraph = [];
    list = [];
  };
  for (const raw of text.split('\n')) {
    const line = raw.trim();
    const heading = /^#{1,6} (.*)$/.exec(line);
    const item = /^[-*] (.*)$/.exec(line);
    if (
      !line ||
      heading ||
      (item && paragraph.length) ||
      (!item && list.length)
    )
      flush();
    if (heading)
      blocks.push({ kind: 'heading', inline: parseInline(heading[1]) });
    else if (item) list.push(parseInline(item[1]));
    else if (line) paragraph.push(line);
  }
  flush();
  return blocks;
}
