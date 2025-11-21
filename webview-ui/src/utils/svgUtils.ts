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
