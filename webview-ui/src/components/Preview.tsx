import { useEffect, useRef } from 'react';
import panzoom from 'panzoom';
import { getNodePath, getNodeByPath, type SvgBreadcrumbItem } from '../utils/svgUtils';

interface PreviewProps {
  svgContent: string;
  onSelect: (path: number[], multi: boolean) => void;
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

  useEffect(() => {
    if (svgContainerRef.current) {
      svgContainerRef.current.innerHTML = svgContent;
      
      const attachListeners = (element: Element) => {
        element.addEventListener('click', (e) => {
          e.stopPropagation();
          const mouseEvent = e as unknown as MouseEvent;
          const isMulti = mouseEvent.metaKey || mouseEvent.ctrlKey || mouseEvent.shiftKey;
          if (svgContainerRef.current && svgContainerRef.current.firstElementChild) {
             const root = svgContainerRef.current.firstElementChild;
             const path = getNodePath(e.target as Element, root);
             onSelect(path, isMulti);
          }
        });
        
        Array.from(element.children).forEach(attachListeners);
      };

      if (svgContainerRef.current.firstElementChild) {
         attachListeners(svgContainerRef.current.firstElementChild);
      }
    }
  }, [svgContent, onSelect]);

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
                  onClick={() => onSelect(item.path, false)}
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
