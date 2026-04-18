export const parseSvg = (svgText: string): Document => {
  const parser = new DOMParser();
  return parser.parseFromString(svgText, "image/svg+xml");
};

export const serializeSvg = (doc: Document): string => {
  const serializer = new XMLSerializer();
  return serializer.serializeToString(doc);
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
