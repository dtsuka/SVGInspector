import { useEffect, useRef } from 'react';
import panzoom from 'panzoom';
import { getNodePath, getNodeByPath } from '../utils/svgUtils';

interface PreviewProps {
  svgContent: string;
  onSelect: (path: number[], multi: boolean) => void;
  selectedNodePaths: number[][];
}

export const Preview: React.FC<PreviewProps> = ({ svgContent, onSelect, selectedNodePaths }) => {
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
      style={{ 
        width: '100%', 
        height: '100%', 
        overflow: 'hidden', 
        backgroundColor: '#1e1e1e', // Dark background
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center'
      }}
    >
      <div className="svg-image" ref={svgContainerRef} />
    </div>
  );
};
