/** レイヤーツリー／プレビューでの選択修飾キー */
export type SelectionModifier = 'none' | 'toggle' | 'range';

export function modifierFromMouseEvent(e: {
  shiftKey: boolean;
  metaKey: boolean;
  ctrlKey: boolean;
}): SelectionModifier {
  if (e.shiftKey) return 'range';
  if (e.metaKey || e.ctrlKey) return 'toggle';
  return 'none';
}

/** レイヤーツリーに表示されているノードを上から順に収集（ルート含む） */
export function collectVisibleLayerNodes(
  root: Element,
  isNodeExpanded: (node: Element) => boolean
): Element[] {
  const result: Element[] = [];

  const walk = (node: Element) => {
    result.push(node);
    if (!isNodeExpanded(node)) return;
    for (const child of Array.from(node.children)) {
      walk(child);
    }
  };

  walk(root);
  return result;
}

/** 表示順リスト上で anchor と target の間（両端含む）を返す */
export function getRangeBetween(
  orderedNodes: Element[],
  anchor: Element,
  target: Element
): Element[] {
  const anchorIndex = orderedNodes.indexOf(anchor);
  const targetIndex = orderedNodes.indexOf(target);

  if (anchorIndex === -1 && targetIndex === -1) {
    return [target];
  }
  if (anchorIndex === -1) {
    return [target];
  }
  if (targetIndex === -1) {
    return [anchor];
  }

  const from = Math.min(anchorIndex, targetIndex);
  const to = Math.max(anchorIndex, targetIndex);
  return orderedNodes.slice(from, to + 1);
}

export function pathKey(path: number[]): string {
  return path.join(',');
}
