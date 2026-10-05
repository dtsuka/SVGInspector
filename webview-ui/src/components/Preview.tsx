import { useEffect, useRef } from 'react';
import panzoom from 'panzoom';
import { getNodePath, getNodeByPath, type SvgBreadcrumbItem } from '../utils/svgUtils';
import { modifierFromMouseEvent, type SelectionModifier } from '../utils/selectionUtils';

interface PreviewProps {
  svgContent: string;
  onSelect: (path: number[], modifier: SelectionModifier) => void;
  selectedNodePaths: number[][];
  breadcrumbItems: SvgBreadcrumbItem[];
}

export const Preview: React.FC<PreviewProps> = ({
  svgContent,
  onSelect,
  selectedNodePaths,
  breadcrumbItems,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (svgContainerRef.current) {
      const pz = panzoom(svgContainerRef.current, {
        maxZoom: 10,
        minZoom: 0.1,
      });
      return () => {
        pz.dispose();
      };
    }
  }, []);

  // onSelect は親の再描画ごとに変わるため ref で保持し、SVG の再描画は svgContent の変化時だけに限る
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // クリックはコンテナで1つのリスナーにまとめて受ける
  useEffect(() => {
    const container = svgContainerRef.current;
    if (!container) return;

    const handleClick = (e: MouseEvent) => {
      const root = container.firstElementChild;
      const target = e.target as Element | null;
      if (!root || !target || !root.contains(target)) return;
      onSelectRef.current(getNodePath(target, root), modifierFromMouseEvent(e));
    };

    container.addEventListener('click', handleClick);
    return () => container.removeEventListener('click', handleClick);
  }, []);

  useEffect(() => {
    if (svgContainerRef.current) {
      svgContainerRef.current.innerHTML = svgContent;
    }
  }, [svgContent]);

  // Highlight selection
  useEffect(() => {
      if (!svgContainerRef.current || !svgContainerRef.current.firstElementChild) return;

      // Clear previous highlights
      const all = svgContainerRef.current.querySelectorAll('*');
      all.forEach(el => (el as HTMLElement).style.outline = 'none');

      // Find targets by path
      const root = svgContainerRef.current.firstElementChild;
      
      selectedNodePaths.forEach(path => {
        const target = getNodeByPath(root, path);
        if (target) {
          (target as HTMLElement).style.outline = '2px solid #007fd4';
        }
      });
  }, [selectedNodePaths, svgContent]);

  return (
    <div
      ref={containerRef}
      className="preview-root"
    >
      {breadcrumbItems.length > 0 && (
        <nav
          className="preview-breadcrumb"
          aria-label="Selection path"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <ol className="preview-breadcrumb-list">
            {breadcrumbItems.map((item, index) => (
              <li key={`${item.path.join('-')}-${index}`} className="preview-breadcrumb-li">
                {index > 0 && (
                  <span className="preview-breadcrumb-sep" aria-hidden>
                    ›
                  </span>
                )}
                <button
                  type="button"
                  className="preview-breadcrumb-btn"
                  title={`Select ${item.tagName}${item.idSuffix}${item.classSuffix}`}
                  onClick={() => onSelect(item.path, 'none')}
                >
                  <span className="preview-breadcrumb-tag">{item.tagName}</span>
                  {item.idSuffix && (
                    <span className="preview-breadcrumb-id">{item.idSuffix}</span>
                  )}
                  {item.classSuffix && (
                    <span className="preview-breadcrumb-class">{item.classSuffix}</span>
                  )}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}
      <div className="preview-svg-wrap">
        <div className="svg-image" ref={svgContainerRef} />
      </div>
    </div>
  );
};
