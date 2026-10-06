export const parseSvg = (svgText: string): Document => {
  const parser = new DOMParser();
  return parser.parseFromString(svgText, "image/svg+xml");
};

const SVG_NS = 'http://www.w3.org/2000/svg';

/** DOMParser がエラー時に挿入する parsererror 要素の名前空間（Chromium / WebKit は XHTML、Firefox は独自） */
const PARSER_ERROR_NAMESPACES = [
  'http://www.w3.org/1999/xhtml',
  'http://www.mozilla.org/newlayout/xml/parsererror.xml',
];

/**
 * パース結果が正しい SVG 文書でなければ、エラーメッセージを返す。
 * 不正な XML の場合、DOMParser は例外を出さずに <parsererror> を含む文書を返すため、ここで判定する。
 * SVG 内に同名の要素があっても誤判定しないよう、parsererror は名前空間で区別する。
 */
export const getSvgParseError = (doc: Document): string | null => {
  for (const ns of PARSER_ERROR_NAMESPACES) {
    const parserError = doc.getElementsByTagNameNS(ns, 'parsererror')[0];
    if (parserError) {
      return parserError.textContent?.trim() || 'Invalid XML';
    }
  }
  const root = doc.documentElement;
  if (!root || root.localName !== 'svg' || root.namespaceURI !== SVG_NS) {
    return 'Root element is not <svg>';
  }
  return null;
};

/**
 * 元テキストからルート要素より前（XML 宣言・コメント・DOCTYPE と改行）と、
 * ルート要素より後（末尾の改行・コメント）の部分を取り出す。
 * 判定できない場合は null を返す。
 */
const splitPrologAndEpilog = (sourceText: string): { prolog: string; epilog: string } | null => {
  let start = 0;
  for (;;) {
    while (start < sourceText.length && /\s/.test(sourceText[start])) start++;
    if (sourceText.startsWith('<?', start)) {
      const end = sourceText.indexOf('?>', start);
      if (end === -1) return null;
      start = end + 2;
    } else if (sourceText.startsWith('<!--', start)) {
      const end = sourceText.indexOf('-->', start);
      if (end === -1) return null;
      start = end + 3;
    } else if (sourceText.startsWith('<!DOCTYPE', start)) {
      // 内部サブセット [...] を含む場合も考慮する
      const bracket = sourceText.indexOf('[', start);
      const close = sourceText.indexOf('>', start);
      if (close === -1) return null;
      if (bracket !== -1 && bracket < close) {
        const subsetEnd = sourceText.indexOf(']', bracket);
        if (subsetEnd === -1) return null;
        const end = sourceText.indexOf('>', subsetEnd);
        if (end === -1) return null;
        start = end + 1;
      } else {
        start = close + 1;
      }
    } else {
      break;
    }
  }
  if (sourceText[start] !== '<') return null;

  let end = sourceText.length;
  for (;;) {
    while (end > 0 && /\s/.test(sourceText[end - 1])) end--;
    if (sourceText.endsWith('-->', end)) {
      const commentStart = sourceText.lastIndexOf('<!--', end);
      if (commentStart === -1) return null;
      end = commentStart;
    } else if (sourceText.endsWith('?>', end)) {
      const piStart = sourceText.lastIndexOf('<?', end);
      if (piStart === -1) return null;
      end = piStart;
    } else {
      break;
    }
  }
  if (end <= start || sourceText[end - 1] !== '>') return null;

  return { prolog: sourceText.slice(0, start), epilog: sourceText.slice(end) };
};

/**
 * 文書を文字列に戻す。
 * XMLSerializer はルート要素の前後の改行（XML 宣言の後や末尾の改行）を落とすため、
 * sourceText が渡された場合はその部分を元テキストのまま残し、ルート要素だけを置き換える。
 */
export const serializeSvg = (doc: Document, sourceText?: string): string => {
  const serializer = new XMLSerializer();
  const parts = sourceText ? splitPrologAndEpilog(sourceText) : null;
  if (!parts) {
    return serializer.serializeToString(doc);
  }
  return parts.prolog + serializer.serializeToString(doc.documentElement) + parts.epilog;
};

export const getNodePath = (node: Element, root: Element): number[] => {
  const path: number[] = [];
  let current = node;

  while (current !== root && current.parentElement) {
    const parent = current.parentElement;
    const index = Array.from(parent.children).indexOf(current);
    path.unshift(index);
    current = parent;
  }

  return path;
};

export const getNodeByPath = (root: Element, path: number[]): Element | null => {
  let current = root;

  for (const index of path) {
    if (!current.children[index]) return null;
    current = current.children[index];
  }

  return current;
};

/** パンくず1項目：ルートから該当ノードまでのパスと表示用ラベル断片 */
export type SvgBreadcrumbItem = {
  path: number[];
  tagName: string;
  idSuffix: string;
  classSuffix: string;
};

/**
 * 主選択ノードから svg ルートまでの祖先チェーン（ルート→葉）を返す。
 * selected が root 配下でない場合は空配列。
 */
export function getSvgBreadcrumbItems(root: Element, selected: Element | null): SvgBreadcrumbItem[] {
  if (!selected || !root.contains(selected)) {
    return [];
  }

  const chain: Element[] = [];
  let current: Element | null = selected;
  while (current) {
    chain.unshift(current);
    if (current === root) {
      break;
    }
    current = current.parentElement;
  }

  if (chain.length === 0 || chain[0] !== root) {
    return [];
  }

  return chain.map((el) => ({
    path: getNodePath(el, root),
    tagName: el.tagName,
    idSuffix: el.id ? `#${el.id}` : '',
    classSuffix: el.classList.length ? `.${Array.from(el.classList).join('.')}` : '',
  }));
}
