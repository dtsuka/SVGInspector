import React, { useState } from 'react';
import { EyeIcon, EyeOffIcon, ChevronRightIcon, ChevronDownIcon } from './Icons';
import { modifierFromMouseEvent, type SelectionModifier } from '../utils/selectionUtils';

interface LayerTreeProps {
  node: Element;
  onSelect: (node: Element, modifier: SelectionModifier) => void;
  onToggleVisibility: (node: Element) => void;
  onToggleExpand: (node: Element) => void;
  onMoveNode: (source: Element[], target: Element, position: 'before' | 'after' | 'inside') => void;
  isNodeExpanded: (node: Element) => boolean;
  selectedNodes: Element[];
  depth?: number;
}

export const LayerTree: React.FC<LayerTreeProps> = ({ 
  node, 
  onSelect, 
  onToggleVisibility,
  onToggleExpand,
  onMoveNode,
  isNodeExpanded,
  selectedNodes, 
  depth = 0 
}) => {
  const children = Array.from(node.children);
  const isSelected = selectedNodes.includes(node);
  const hasChildren = children.length > 0;
  const isExpanded = isNodeExpanded(node);
  const [dropPosition, setDropPosition] = useState<'before' | 'after' | 'inside' | null>(null);

  // Check visibility
  const isVisible = node.getAttribute('visibility') !== 'hidden';

  // Skip non-graphical elements if needed, but for now show everything
  const tagName = node.tagName;
  const id = node.id ? `#${node.id}` : '';
  const classes = node.classList.length ? `.${Array.from(node.classList).join('.')}` : '';

  const handleSelect = (e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(node, modifierFromMouseEvent(e));
  };

  const toggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleExpand(node);
  };

  const handleVisibilityClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleVisibility(node);
  };

  // Drag & Drop Handlers
  const handleDragStart = (e: React.DragEvent) => {
    e.stopPropagation();
    
    // Determine what is being dragged
    let draggedNodes: Element[] = [node];
    
    // If the current node is part of the selection, drag all selected nodes
    if (selectedNodes.includes(node)) {
      draggedNodes = [...selectedNodes];
    }
    
    (window as any).__draggedNodes = draggedNodes;
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedNodes = (window as any).__draggedNodes as Element[];
    if (!draggedNodes || draggedNodes.length === 0) {
      setDropPosition(null);
      return;
    }

    // Prevent dropping into itself or children of dragged nodes
    const isInvalid = draggedNodes.some(draggedNode => 
      draggedNode === node || draggedNode.contains(node)
    );

    if (isInvalid) {
      setDropPosition(null);
      return;
    }

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const y = e.clientY - rect.top;
    const height = rect.height;

    if (hasChildren && y > height * 0.25 && y < height * 0.75) {
       setDropPosition('inside');
    } else if (y < height * 0.5) {
       setDropPosition('before');
    } else {
       setDropPosition('after');
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.stopPropagation();
    setDropPosition(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const draggedNodes = (window as any).__draggedNodes as Element[];
    if (draggedNodes && dropPosition) {
      onMoveNode(draggedNodes, node, dropPosition);
    }
    setDropPosition(null);
    (window as any).__draggedNodes = null;
  };

  const isBeingDragged = (window as any).__draggedNodes?.includes(node);

  return (
    <div style={{ 
      paddingLeft: depth === 0 ? 0 : '12px', 
      fontFamily: 'monospace', 
      fontSize: '13px',
      lineHeight: '1.5'
    }}>
      <div 
        draggable
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleSelect}
        style={{ 
          cursor: 'pointer', 
          backgroundColor: isSelected ? '#37373d' : 'transparent',
          padding: '2px 4px',
          display: 'flex',
          alignItems: 'center',
          whiteSpace: 'nowrap',
          boxSizing: 'border-box',
          border: '1px solid',
          borderColor: isSelected ? '#007fd4' : 'transparent',
          boxShadow:
            dropPosition === 'before'
              ? 'inset 0 2px 0 0 #007fd4'
              : dropPosition === 'after'
                ? 'inset 0 -2px 0 0 #007fd4'
                : undefined,
          outline: dropPosition === 'inside' ? '2px dashed #007fd4' : undefined,
          outlineOffset: dropPosition === 'inside' ? -2 : undefined,
          opacity: isBeingDragged ? 0.5 : 1
        }}
      >
        {/* Visibility Toggle */}
        <span
          onClick={handleVisibilityClick}
          style={{
            marginRight: '6px',
            display: 'flex',
            alignItems: 'center',
            color: isVisible ? '#c5c5c5' : '#666',
            cursor: 'pointer'
          }}
          title={isVisible ? "Hide" : "Show"}
        >
          {isVisible ? <EyeIcon size={14} /> : <EyeOffIcon size={14} />}
        </span>

        {/* Expand/Collapse Icon */}
        <span 
          onClick={hasChildren ? toggleExpand : undefined}
          style={{ 
            width: '16px', 
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: hasChildren ? 'pointer' : 'default',
            color: '#c5c5c5',
            marginRight: '4px',
            userSelect: 'none'
          }}
        >
          {hasChildren ? (
            isExpanded ? <ChevronDownIcon size={14} /> : <ChevronRightIcon size={14} />
          ) : <span style={{ width: 14 }} />}
        </span>

        {/* Node Label */}
        <span style={{ color: '#569cd6' }}>{tagName}</span>
        {id && <span style={{ color: '#d7ba7d' }}>{id}</span>}
        {classes && <span style={{ color: '#4ec9b0' }}>{classes}</span>}
      </div>

      {hasChildren && isExpanded && (
        <div style={{ borderLeft: '1px solid #333', marginLeft: '19px' }}>
          {children.map((child, index) => (
            <LayerTree 
              key={index} 
              node={child} 
              onSelect={onSelect} 
              onToggleVisibility={onToggleVisibility}
              onToggleExpand={onToggleExpand}
              onMoveNode={onMoveNode}
              isNodeExpanded={isNodeExpanded}
              selectedNodes={selectedNodes} 
              depth={depth + 1} 
            />
          ))}
        </div>
      )}
    </div>
  );
};
